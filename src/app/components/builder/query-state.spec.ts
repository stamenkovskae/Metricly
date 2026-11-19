import { describe, expect, it } from 'vitest';
import { QueryState, isDisabled, isUsed } from './query-state';
import { Block } from './palette/blocks';

const m = (value: 'requests' | 'errors' | 'responseTime' | 'errorRate'): Block => ({ kind: 'metric', value });
const status = (value: string): Block => ({ kind: 'filter', value: { by: 'status', value } });

describe('QueryState', () => {
  it('starts empty and only allows metric blocks', () => {
    const s = new QueryState();
    expect(s.query()).toBeNull();
    expect(isDisabled(null, m('requests'))).toBe(false);
    expect(isDisabled(null, { kind: 'look', value: 'bars' })).toBe(true);
    s.add({ kind: 'look', value: 'bars' });
    expect(s.query()).toBeNull();
  });

  it('first metric drops in with defaults', () => {
    const s = new QueryState();
    s.add(m('requests'));
    expect(s.query()).toEqual({ metric: 'requests', speed: 'second', filters: [], look: 'line', rangeMinutes: 30 });
  });

  it('a block of the same kind replaces the old one', () => {
    const s = new QueryState();
    s.add(m('requests'));
    s.add({ kind: 'speed', value: 'minute' });
    s.add({ kind: 'split', value: 'endpoint' });
    s.add({ kind: 'split', value: 'service' });
    s.add({ kind: 'filter', value: { by: 'method', value: 'GET' } });
    s.add({ kind: 'filter', value: { by: 'method', value: 'POST' } });
    expect(s.query()).toMatchObject({ speed: 'minute', splitBy: 'service', filters: [{ by: 'method', value: 'POST' }] });
    expect(isUsed(s.query(), { kind: 'speed', value: 'minute' })).toBe(true);
    expect(isUsed(s.query(), { kind: 'speed', value: 'second' })).toBe(false);
  });

  it('speed blocks are disabled for responseTime/errorRate; metric switch swaps speed/percentile', () => {
    const s = new QueryState();
    s.add(m('responseTime'));
    expect(s.query()).toMatchObject({ percentile: 95 });
    expect(s.query()?.speed).toBeUndefined();
    expect(isDisabled(s.query(), { kind: 'speed', value: 'minute' })).toBe(true);
    s.add({ kind: 'speed', value: 'minute' }); // ignored
    expect(s.query()?.speed).toBeUndefined();
    s.add(m('requests'));
    expect(s.query()).toMatchObject({ speed: 'second' });
    expect(s.query()?.percentile).toBeUndefined();
    expect(isDisabled(s.query(), { kind: 'percentile', value: 99 })).toBe(true);
    s.add(m('errorRate'));
    expect(isDisabled(s.query(), { kind: 'speed', value: 'hour' })).toBe(true);
  });

  it('Errors and status filters exclude each other', () => {
    const s = new QueryState();
    s.add(m('requests'));
    s.add(status('404'));
    expect(isDisabled(s.query(), m('errors'))).toBe(true);
    s.add(m('errors'));
    expect(s.query()?.metric).toBe('requests');
    s.remove('filter:status');
    s.add(m('errors'));
    expect(isDisabled(s.query(), status('5xx'))).toBe(true);
    expect(isDisabled(s.query(), { kind: 'filter', value: { by: 'method', value: 'GET' } })).toBe(false);
  });

  it('remove updates the query', () => {
    const s = new QueryState();
    s.add(m('requests'));
    s.add({ kind: 'split', value: 'endpoint' });
    s.add({ kind: 'look', value: 'bars' });
    s.remove('split');
    s.remove('look');
    expect(s.query()?.splitBy).toBeUndefined();
    expect(s.query()?.look).toBe('line');
    s.remove('metric');
    expect(s.query()).toBeNull();
  });

  it('load replaces the query', () => {
    const s = new QueryState();
    const q = { metric: 'errorRate' as const, filters: [], look: 'number' as const, rangeMinutes: 5 };
    s.load(q);
    expect(s.query()).toEqual(q);
  });
});
