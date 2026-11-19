import { describe, expect, it, vi } from 'vitest';
import { mapResult, runQuery, validateQuery } from './query-proxy';

const ok = { metric: 'requests', speed: 'minute', filters: [], look: 'line', rangeMinutes: 60 };

describe('validateQuery', () => {
  it('accepts a valid query', () =>
    expect(validateQuery(ok)).toMatchObject({ metric: 'requests' }));
  it.each([
    [{ ...ok, metric: 'up' }],
    [{ ...ok, rangeMinutes: 4 }],
    [{ ...ok, rangeMinutes: 1441 }],
    [{ ...ok, speed: 'day' }],
    [{ ...ok, splitBy: 'job' }],
    [{ ...ok, filters: [{ by: 'service', value: 'x'.repeat(101) }] }],
    [{ ...ok, filters: [{ by: 'nope', value: 'a' }] }],
    ['nope'],
  ])('rejects %j', (bad) => expect(typeof validateQuery(bad)).toBe('string'));
});

describe('mapResult', () => {
  const q = validateQuery({ ...ok, splitBy: 'endpoint' }) as never;
  it('labels by split dimension, converts to ms, turns NaN into gaps', () => {
    const s = mapResult(q, {
      status: 'success',
      data: {
        result: [
          {
            metric: { http_route: '/orders' },
            values: [
              [1, '2'],
              [2, 'NaN'],
            ],
          },
        ],
      },
    });
    expect(s[0].label).toBe('/orders');
    expect(s[0].points[0]).toEqual({ t: 1000, v: 2 });
    expect(s[0].points[1].v).toBeNaN();
  });
  it('uses the metric name when unsplit', () => {
    const s = mapResult(validateQuery(ok) as never, {
      status: 'success',
      data: { result: [{ metric: {}, values: [] }] },
    });
    expect(s[0].label).toBe('requests');
  });
});

describe('runQuery', () => {
  it('400 on bad input without calling Prometheus', async () => {
    const f = vi.fn();
    expect((await runQuery({}, f)).status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });
  it('200 with promql + series, step ~120 points', async () => {
    const f = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { result: [{ metric: {}, values: [[1, '1']] }] } }),
    });
    const r = await runQuery(ok, f, 7_200_000);
    expect(r.status).toBe(200);
    expect(f.mock.calls[0][0]).toContain('step=30');
    expect((r.body as { promql: string }).promql).toContain(
      'http_server_request_duration_seconds_count',
    );
  });
  it('502 when Prometheus is down', async () => {
    const r = await runQuery(ok, vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    expect(r.status).toBe(502);
  });
});
