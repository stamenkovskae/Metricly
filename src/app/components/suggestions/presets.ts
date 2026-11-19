import { ChartQuery } from '../../query/chart-query';

export interface Preset {
  name: string;
  blurb: string;
  query: ChartQuery;
  /** Inline SVG markup for the tile thumbnail (static, trusted). */
  thumb: string;
}

const svg = (inner: string) => `<svg viewBox="0 0 100 44" aria-hidden="true">${inner}</svg>`;
const line = (d: string, c: string, extra = '') =>
  `<path d="${d}" fill="none" stroke="var(--${c})" stroke-width="3.5" stroke-linecap="round" ${extra}/>`;

export const PRESETS: Preset[] = [
  {
    name: 'Traffic',
    blurb: 'Requests per second',
    query: { metric: 'requests', speed: 'second', filters: [], look: 'line', rangeMinutes: 60 },
    thumb: svg(line('M4,34 Q20,18 34,26 T64,14 T96,8', 's1')),
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
    thumb: svg(
      '<g fill="var(--s1)"><rect x="8" y="8" width="14" height="36" rx="5"/><rect x="30" y="16" width="14" height="28" rx="5"/><rect x="52" y="24" width="14" height="20" rx="5"/><rect x="74" y="32" width="14" height="12" rx="5"/></g>',
    ),
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
    thumb: svg(
      '<path d="M4,38 L30,36 Q44,34 52,14 T70,34 L96,32" fill="none" stroke="var(--s3)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>',
    ),
  },
  {
    name: 'Error rate',
    blurb: 'Big number, last 5 minutes',
    query: { metric: 'errorRate', filters: [], look: 'number', rangeMinutes: 5 },
    thumb: '<div class="big" aria-hidden="true">0.4%</div>',
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
    thumb: svg(
      '<path d="M4,32 Q22,30 36,22 T66,16 T96,8 L96,44 L4,44 Z" fill="oklch(58% 0.12 190 / .2)"/>' +
        line('M4,32 Q22,30 36,22 T66,16 T96,8', 's2'),
    ),
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
    thumb: svg(
      line('M4,14 Q30,10 50,18 T96,12', 's1') +
        line('M4,32 Q30,30 50,28 T96,24', 's2', 'stroke-dasharray="1 8"'),
    ),
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
