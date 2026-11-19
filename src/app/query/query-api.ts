import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ChartSeries } from '../chart/chart-series';
import { ChartQuery } from './chart-query';

export interface QueryResponse {
  promql: string;
  series: ChartSeries[];
}

/** Thin client for `POST /api/query`. Unsubscribing aborts the request. Errors carry a human message. */
@Injectable({ providedIn: 'root' })
export class QueryApi {
  run(q: ChartQuery): Observable<QueryResponse> {
    return new Observable((sub) => {
      const abort = new AbortController();
      fetch('/api/query', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(q),
        signal: abort.signal,
      })
        .then(async (res) => {
          const body = await res.json().catch(() => null);
          if (!res.ok) throw new Error(body?.error ?? `The server answered ${res.status}.`);
          // The proxy sends gaps as null (JSON has no NaN); the chart contract says number.
          // Trailing gaps are dropped: end-of-line labels and the Big number read the last point.
          for (const s of body.series) {
            for (const p of s.points) p.v ??= NaN;
            while (s.points.length && Number.isNaN(s.points.at(-1).v)) s.points.pop();
          }
          sub.next(body);
          sub.complete();
        })
        .catch((e) => {
          if (abort.signal.aborted) return;
          sub.error(e instanceof TypeError ? new Error("Can't reach the Metricly server.") : e);
        });
      return () => abort.abort();
    });
  }
}
