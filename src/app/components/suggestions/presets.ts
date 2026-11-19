import { ChartQuery } from '../../query/chart-query';

export interface Preset {
  name: string;
  blurb: string;
  query: ChartQuery;
  /** Which mini chart the tile shows (drawn in suggestions.component.html). */
  thumb: 'line' | 'bars' | 'spike' | 'number' | 'area' | 'two';
}

export const PRESETS: Preset[] = [
  {
    name: 'Traffic',
    blurb: 'Requests per second',
    query: { metric: 'requests', speed: 'second', filters: [], look: 'line', rangeMinutes: 60 },
    thumb: 'line',
  },
  {
    name: 'Busiest endpoints',
    blurb: 'Requests per minute by endpoint',
    query: {
      metric: 'requests',
      speed: 'minute',
      filters: [],
      splitBy: 'endpoint',
      look: 'bars',
      rangeMinutes: 60,
    },
    thumb: 'bars',
  },
  {
    name: 'Oops moments',
    blurb: 'Failures per minute by service',
    query: {
      metric: 'errors',
      speed: 'minute',
      filters: [],
      splitBy: 'service',
      look: 'line',
      rangeMinutes: 60,
    },
    thumb: 'spike',
  },
  {
    name: 'Error rate',
    blurb: 'Big number, last 5 minutes',
    query: { metric: 'errorRate', filters: [], look: 'number', rangeMinutes: 5 },
    thumb: 'number',
  },
  {
    name: 'Slowest pages',
    blurb: 'Response time, 95% of requests',
    query: {
      metric: 'responseTime',
      percentile: 95,
      filters: [],
      splitBy: 'endpoint',
      look: 'area',
      rangeMinutes: 60,
    },
    thumb: 'area',
  },
  {
    name: 'Orders vs Users',
    blurb: 'Requests by service',
    query: {
      metric: 'requests',
      speed: 'second',
      filters: [],
      splitBy: 'service',
      look: 'line',
      rangeMinutes: 60,
    },
    thumb: 'two',
  },
];

/** Deep-equal on everything except rangeMinutes (key order and undefined fields ignored). */
export function sameQuery(a: ChartQuery, b: ChartQuery): boolean {
  const norm = (q: ChartQuery) =>
    JSON.stringify(
      Object.entries(q)
        .filter(([k, v]) => k !== 'rangeMinutes' && v !== undefined)
        .sort(([x], [y]) => x.localeCompare(y)),
    );
  return norm(a) === norm(b);
}
