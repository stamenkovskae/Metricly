import { ChartQuery, Dim, Filter, Speed } from './chart-query';

const LABEL: Record<Dim, string> = {
  service: 'job',
  endpoint: 'http_route',
  method: 'http_request_method',
  status: 'http_response_status_code',
};
const MULTIPLIER: Record<Speed, number> = { second: 1, minute: 60, hour: 3600 };
const COUNT = 'http_server_request_duration_seconds_count';
const BUCKET = 'http_server_request_duration_seconds_bucket';

const escape = (v: string) => v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

function matcher({ by, value }: Filter): string {
  const xx = by === 'status' && /^([1-5])xx$/i.exec(value);
  // '5xx' -> regex 5.. ; anything else is an exact match (escaped)
  return xx ? `${LABEL[by]}=~"${xx[1]}.."` : `${LABEL[by]}="${escape(value)}"`;
}

// Prometheus' own scrape (/metrics) is not user traffic; skip it unless the user asks for a route.
const NO_SCRAPE = `${LABEL.endpoint}!="/metrics"`;

function selector(metric: string, filters: Filter[], extra: string[] = []): string {
  const m = [...filters.map(matcher), ...extra];
  if (!filters.some((f) => f.by === 'endpoint')) m.push(NO_SCRAPE);
  return m.length ? `${metric}{${m.join(',')}}` : metric;
}

export function compile(q: ChartQuery): string {
  const by = (extra: string[] = []) => {
    const labels = [...extra, ...(q.splitBy ? [LABEL[q.splitBy]] : [])];
    return labels.length ? ` by (${labels.join(', ')})` : '';
  };
  const fiveXx = [`${LABEL.status}=~"5.."`];

  switch (q.metric) {
    case 'requests':
    case 'errors': {
      const speed = q.speed ?? 'second';
      const win = speed === 'second' ? '1m' : '5m';
      const sel = selector(COUNT, q.filters, q.metric === 'errors' ? fiveXx : []);
      const mult = MULTIPLIER[speed];
      return `sum${by()} (rate(${sel}[${win}]))${mult === 1 ? '' : ` * ${mult}`}`;
    }
    case 'errorRate': {
      const err = selector(COUNT, q.filters, fiveXx);
      const all = selector(COUNT, q.filters);
      return `100 * sum${by()} (rate(${err}[5m])) / sum${by()} (rate(${all}[5m]))`;
    }
    case 'responseTime': {
      const p = (q.percentile ?? 95) / 100;
      return `histogram_quantile(${p}, sum${by(['le'])} (rate(${selector(BUCKET, q.filters)}[5m])))`;
    }
  }
}
