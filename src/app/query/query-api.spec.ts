import { lastValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { ChartQuery } from './chart-query';
import { QueryApi } from './query-api';

const q: ChartQuery = { metric: 'requests', speed: 'minute', filters: [], look: 'line', rangeMinutes: 30 };
const reply = (status: number, body: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe('QueryApi', () => {
  afterEach(() => vi.restoreAllMocks());

  it('posts the query; null gaps become NaN and trailing gaps are dropped', async () => {
    const spy = reply(200, {
      promql: 'p',
      series: [{ label: 'a', points: [{ t: 1, v: 1 }, { t: 2, v: null }, { t: 3, v: 3 }, { t: 4, v: null }] }],
    });
    const r = await lastValueFrom(new QueryApi().run(q));
    expect(JSON.parse(spy.mock.calls[0][1]!.body as string)).toEqual(q);
    expect(r.promql).toBe('p');
    expect(r.series[0].points.map((p) => p.v)).toEqual([1, NaN, 3]);
  });

  it('turns server errors into their message', async () => {
    reply(502, { error: "Can't reach Prometheus right now." });
    await expect(lastValueFrom(new QueryApi().run(q))).rejects.toThrow("Can't reach Prometheus");
  });

  it('unsubscribing aborts the request', () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>(() => undefined));
    new QueryApi().run(q).subscribe().unsubscribe();
    expect((spy.mock.calls[0][1]!.signal as AbortSignal).aborted).toBe(true);
  });
});
