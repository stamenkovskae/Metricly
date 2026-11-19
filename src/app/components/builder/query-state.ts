import { Injectable, signal } from '@angular/core';
import { ChartQuery } from '../../query/chart-query';
import { Block, BlockKey, blocksOf, sameBlock } from './palette/blocks';

const hasStatusFilter = (q: ChartQuery) => q.filters.some((f) => f.by === 'status');

/** Blocks that make no sense right now (or at all, before a metric is picked). */
export function isDisabled(q: ChartQuery | null, b: Block): boolean {
  if (!q) return b.kind !== 'metric';
  const timed = q.metric === 'requests' || q.metric === 'errors';
  switch (b.kind) {
    case 'speed': return !timed;
    case 'percentile': return q.metric !== 'responseTime';
    // "Errors" already means 5xx, so any status filter makes it always empty.
    case 'metric': return b.value === 'errors' && hasStatusFilter(q);
    case 'filter': return b.value.by === 'status' && q.metric === 'errors';
    default: return false;
  }
}

export const isUsed = (q: ChartQuery | null, b: Block) => !!q && blocksOf(q).some((x) => sameBlock(x, b));

/** Returns the query with the block applied, replacing any block of the same kind. */
export function apply(q: ChartQuery | null, b: Block): ChartQuery {
  const n: ChartQuery = { metric: 'requests', speed: 'second', filters: [], look: 'line', rangeMinutes: 30, ...q };
  switch (b.kind) {
    case 'metric':
      n.metric = b.value;
      if (b.value === 'requests' || b.value === 'errors') n.speed ??= 'second';
      else delete n.speed;
      if (b.value === 'responseTime') n.percentile ??= 95;
      else delete n.percentile;
      break;
    case 'speed': n.speed = b.value; break;
    case 'percentile': n.percentile = b.value; break;
    case 'filter': n.filters = [...n.filters.filter((f) => f.by !== b.value.by), b.value]; break;
    case 'split': n.splitBy = b.value; break;
    case 'look': n.look = b.value; break;
  }
  return n;
}

/** Holds the chart being built. `null` until the first Metric block is added. */
@Injectable({ providedIn: 'root' })
export class QueryState {
  private readonly _query = signal<ChartQuery | null>(null);
  readonly query = this._query.asReadonly();
  /** True while a palette block is being dragged (canvas highlights itself). */
  readonly dragging = signal(false);

  add(b: Block): void {
    if (!isDisabled(this._query(), b)) this._query.set(apply(this._query(), b));
  }

  remove(key: BlockKey): void {
    const q = this._query();
    if (!q || key === 'metric') return this._query.set(null);
    const n = { ...q, filters: q.filters.filter((f) => `filter:${f.by}` !== key) };
    if (key === 'speed') delete n.speed;
    if (key === 'percentile') delete n.percentile;
    if (key === 'split') delete n.splitBy;
    if (key === 'look') n.look = 'line';
    this._query.set(n);
  }

  load(q: ChartQuery): void {
    this._query.set(q);
  }
}
