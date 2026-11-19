import { ChartQuery, Dim, Filter, Look, Metric, Speed } from '../../../query/chart-query';

export type Kind = 'metric' | 'speed' | 'filter' | 'split' | 'look';
type Pct = 50 | 95 | 99;

/** One draggable/clickable block. `percentile` is styled as a speed block (responseTime only). */
export type Block =
  | { kind: 'metric'; value: Metric }
  | { kind: 'speed'; value: Speed }
  | { kind: 'percentile'; value: Pct }
  | { kind: 'filter'; value: Filter }
  | { kind: 'split'; value: Dim }
  | { kind: 'look'; value: Look };

/** Two blocks with the same key occupy the same slot: adding one replaces the other. */
export type BlockKey = 'metric' | 'speed' | 'percentile' | 'split' | 'look' | `filter:${Dim}`;

export const keyOf = (b: Block): BlockKey => (b.kind === 'filter' ? `filter:${b.value.by}` : b.kind);
export const cssKind = (b: Block): Kind => (b.kind === 'percentile' ? 'speed' : b.kind);
export const sameBlock = (a: Block, b: Block) =>
  keyOf(a) === keyOf(b) && JSON.stringify(a.value) === JSON.stringify(b.value);

const METRIC: Record<Metric, string> = {
  requests: 'Requests',
  errors: 'Errors',
  responseTime: 'Response time',
  errorRate: 'Error rate %',
};
const FILTER: Record<string, string> = {
  'orders-api': 'orders-api',
  'users-api': 'users-api',
  GET: 'GET',
  POST: 'POST',
  '5xx': 'failures (5xx)',
  '404': 'not found (404)',
};
const LOOK: Record<Look, string> = { line: 'Line', area: 'Area', bars: 'Bars', number: 'Big number' };
const PCT: Record<Pct, string> = { 50: 'median', 95: '95th percentile', 99: '99th percentile' };

/** Text on the palette block. */
export function label(b: Block): string {
  switch (b.kind) {
    case 'metric': return METRIC[b.value];
    case 'speed': return `per ${b.value}`;
    case 'percentile': return PCT[b.value];
    case 'filter': return FILTER[b.value.value] ?? b.value.value;
    case 'split': return b.value;
    case 'look': return LOOK[b.value];
  }
}

/** Text on the canvas chip (reads as a sentence). */
export const chipLabel = (b: Block) =>
  b.kind === 'filter' ? `only ${label(b)}` : b.kind === 'split' ? `by ${label(b)}` : b.kind === 'look' ? `as ${label(b)}` : label(b);

/** The blocks that make up a query, in sentence order. Look is always included. */
export function blocksOf(q: ChartQuery): Block[] {
  const out: Block[] = [{ kind: 'metric', value: q.metric }];
  if (q.speed) out.push({ kind: 'speed', value: q.speed });
  if (q.percentile) out.push({ kind: 'percentile', value: q.percentile });
  for (const f of q.filters) out.push({ kind: 'filter', value: f });
  if (q.splitBy) out.push({ kind: 'split', value: q.splitBy });
  out.push({ kind: 'look', value: q.look });
  return out;
}

const f = (by: Dim, value: string): Block => ({ kind: 'filter', value: { by, value } });

export interface Group { title: string; kind: Kind; blocks: Block[] }
export const GROUPS: Group[] = [
  {
    title: 'What do you want to see?',
    kind: 'metric',
    blocks: (['requests', 'errors', 'responseTime', 'errorRate'] as const).map((value) => ({ kind: 'metric', value })),
  },
  {
    title: 'How fast?',
    kind: 'speed',
    blocks: [
      ...(['second', 'minute', 'hour'] as const).map((value): Block => ({ kind: 'speed', value })),
      ...([50, 95, 99] as const).map((value): Block => ({ kind: 'percentile', value })),
    ],
  },
  {
    title: 'Only show…',
    kind: 'filter',
    // ponytail: fixed values only; a free-text "one endpoint" filter needs an input, add when asked.
    blocks: [f('service', 'orders-api'), f('service', 'users-api'), f('method', 'GET'), f('method', 'POST'), f('status', '5xx'), f('status', '404')],
  },
  {
    title: 'Split it up by…',
    kind: 'split',
    blocks: (['endpoint', 'service', 'status', 'method'] as const).map((value) => ({ kind: 'split', value })),
  },
  {
    title: 'How should it look?',
    kind: 'look',
    blocks: (['line', 'area', 'bars', 'number'] as const).map((value) => ({ kind: 'look', value })),
  },
];
