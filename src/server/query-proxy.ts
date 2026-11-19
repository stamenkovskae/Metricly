import { compile } from '../app/query/compile';
import type { ChartSeries } from '../app/chart/chart-series';
import type { ChartQuery, Dim, Look, Metric, Speed } from '../app/query/chart-query';

export interface QueryResponse {
  promql: string;
  series: ChartSeries[];
}
export interface ProxyResult {
  status: number;
  body: QueryResponse | { error: string };
}

const METRICS: Metric[] = ['requests', 'errors', 'responseTime', 'errorRate'];
const SPEEDS: Speed[] = ['second', 'minute', 'hour'];
const LOOKS: Look[] = ['line', 'area', 'bars', 'number'];
const DIMS: Dim[] = ['service', 'endpoint', 'method', 'status'];
const PERCENTILES = [50, 95, 99];
const LABEL: Record<Dim, string> = {
  service: 'job',
  endpoint: 'http_route',
  method: 'http_request_method',
  status: 'http_response_status_code',
};

/** Returns a clean ChartQuery (only known fields) or an error message. */
export function validateQuery(input: unknown): ChartQuery | string {
  if (typeof input !== 'object' || input === null) return 'Body must be a JSON object.';
  const b = input as Record<string, unknown>;
  const oneOf = <T>(v: unknown, list: readonly T[]) => list.includes(v as T);

  if (!oneOf(b['metric'], METRICS)) return 'Unknown metric.';
  if (!oneOf(b['look'], LOOKS)) return 'Unknown look.';
  const range = b['rangeMinutes'];
  if (typeof range !== 'number' || !Number.isFinite(range) || range < 5 || range > 1440)
    return 'rangeMinutes must be a number between 5 and 1440.';
  if (b['speed'] !== undefined && !oneOf(b['speed'], SPEEDS)) return 'Unknown speed.';
  if (b['percentile'] !== undefined && !oneOf(b['percentile'], PERCENTILES))
    return 'percentile must be 50, 95 or 99.';
  if (b['splitBy'] !== undefined && !oneOf(b['splitBy'], DIMS)) return 'Unknown splitBy.';

  const rawFilters = b['filters'] ?? [];
  if (!Array.isArray(rawFilters) || rawFilters.length > 20) return 'filters must be a short list.';
  const filters: ChartQuery['filters'] = [];
  for (const f of rawFilters) {
    if (typeof f !== 'object' || f === null) return 'Invalid filter.';
    const { by, value } = f as Record<string, unknown>;
    if (!oneOf(by, DIMS)) return 'Unknown filter dimension.';
    if (typeof value !== 'string' || value.length === 0 || value.length > 100)
      return 'Filter values must be 1-100 characters.';
    filters.push({ by: by as Dim, value });
  }

  return {
    metric: b['metric'] as Metric,
    look: b['look'] as Look,
    rangeMinutes: range,
    filters,
    ...(b['speed'] !== undefined && { speed: b['speed'] as Speed }),
    ...(b['percentile'] !== undefined && { percentile: b['percentile'] as 50 | 95 | 99 }),
    ...(b['splitBy'] !== undefined && { splitBy: b['splitBy'] as Dim }),
  };
}

interface PromMatrix {
  status: string;
  data?: { result?: { metric?: Record<string, string>; values?: [number, string][] }[] };
}

/** Prometheus matrix -> ChartSeries[]. NaN/Inf samples become NaN (JSON null = gap in Chart.js). */
export function mapResult(q: ChartQuery, prom: PromMatrix): ChartSeries[] {
  return (prom.data?.result ?? []).map((r) => {
    const label = q.splitBy ? (r.metric?.[LABEL[q.splitBy]] ?? '(none)') : q.metric;
    const points = (r.values ?? []).map(([sec, val]) => {
      const v = Number(val);
      return { t: sec * 1000, v: Number.isFinite(v) ? v : NaN };
    });
    return { label, points };
  });
}

export async function runQuery(
  input: unknown,
  fetchImpl: typeof fetch = fetch,
  now = Date.now(),
  base = 'http://localhost:9090', // server.ts passes PROMETHEUS_URL (no `process` here: spec tsconfig lacks node types)
): Promise<ProxyResult> {
  const q = validateQuery(input);
  if (typeof q === 'string') return { status: 400, body: { error: q } };

  const promql = compile(q);
  const end = Math.floor(now / 1000);
  const params = new URLSearchParams({
    query: promql,
    start: String(end - q.rangeMinutes * 60),
    end: String(end),
    step: String(Math.max(5, Math.round((q.rangeMinutes * 60) / 120))),
  });
  const unavailable: ProxyResult = {
    status: 502,
    body: { error: "Can't reach Prometheus right now. Is it running?" },
  };

  try {
    const res = await fetchImpl(`${base}/api/v1/query_range?${params}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return unavailable;
    return { status: 200, body: { promql, series: mapResult(q, await res.json()) } };
  } catch {
    return unavailable;
  }
}
