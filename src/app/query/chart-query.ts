export type Metric = 'requests' | 'errors' | 'responseTime' | 'errorRate';
export type Speed = 'second' | 'minute' | 'hour';
export type Look = 'line' | 'area' | 'bars' | 'number';
export type Dim = 'service' | 'endpoint' | 'method' | 'status';
export interface Filter {
  by: Dim;
  value: string; // status value like '5xx' or '404'
}
export interface ChartQuery {
  metric: Metric;
  speed?: Speed; // not used by responseTime / errorRate
  percentile?: 50 | 95 | 99; // responseTime only
  filters: Filter[];
  splitBy?: Dim;
  look: Look;
  rangeMinutes: number; // 5..1440
}
