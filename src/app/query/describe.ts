import { ChartQuery, Dim, Metric } from './chart-query';

const METRIC: Record<Metric, string> = {
  requests: 'Requests',
  errors: 'Errors',
  responseTime: 'Response time',
  errorRate: 'Error rate %',
};
const DIM: Record<Dim, string> = {
  service: 'service',
  endpoint: 'endpoint',
  method: 'method',
  status: 'status',
};

/** Plain-English sentence shown under the chart, e.g. "Requests, per minute, split by endpoint". */
export function describe(q: ChartQuery): string {
  const parts = [METRIC[q.metric]];
  if (q.metric === 'requests' || q.metric === 'errors') parts.push(`per ${q.speed ?? 'second'}`);
  if (q.metric === 'responseTime') parts.push(`${q.percentile ?? 95}th percentile`);
  for (const f of q.filters) parts.push(`only ${DIM[f.by]} ${f.value}`);
  if (q.splitBy) parts.push(`split by ${DIM[q.splitBy]}`);
  return parts.join(', ');
}
