import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ChartQuery } from '../query/chart-query';

export interface SavedChart {
  id: string;
  title: string;
  query: ChartQuery;
}
export interface Dashboard {
  id: string;
  name: string;
  charts: SavedChart[];
}

export const STORAGE_KEY = 'metricly.dashboards.v1';
/** localStorage can be missing or throw (sandboxed iframes, privacy modes); treat that as "no storage". */
function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
const uid = () => Math.random().toString(36).slice(2, 10);

/** Loads from untrusted storage: anything malformed is dropped, never thrown. */
function parse(raw: string | null): Dashboard[] {
  try {
    const data = JSON.parse(raw ?? '[]');
    if (!Array.isArray(data)) return [];
    return data
      .filter((d) => d && typeof d.id === 'string' && typeof d.name === 'string')
      .map((d) => ({
        id: d.id,
        name: d.name,
        charts: (Array.isArray(d.charts) ? d.charts : []).filter(
          (c: SavedChart) => c && typeof c.id === 'string' && c.query?.metric && Array.isArray(c.query.filters ?? []),
        ).map((c: SavedChart) => ({ ...c, query: { ...c.query, filters: c.query.filters ?? [] } })),
      }));
  } catch {
    return [];
  }
}

/** Saved dashboards, persisted to localStorage (browser only; prerender sees an empty list). */
@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly _dashboards = signal<Dashboard[]>(this.browser ? parse(storage()?.getItem(STORAGE_KEY) ?? null) : []);
  readonly dashboards = this._dashboards.asReadonly();

  /** Adds a chart to `target` (existing id) or a new dashboard (`{ name }`). Returns the dashboard name. */
  save(title: string, query: ChartQuery, target: { id: string } | { name: string }): string {
    const chart: SavedChart = { id: uid(), title, query: structuredClone(query) };
    let name = '';
    if ('id' in target) {
      this.update((ds) => ds.map((d) => (d.id === target.id ? ((name = d.name), { ...d, charts: [...d.charts, chart] }) : d)));
    } else {
      name = target.name;
      this.update((ds) => [...ds, { id: uid(), name, charts: [chart] }]);
    }
    return name;
  }

  deleteChart(dashboardId: string, chartId: string): void {
    this.update((ds) =>
      ds.map((d) => (d.id === dashboardId ? { ...d, charts: d.charts.filter((c) => c.id !== chartId) } : d)),
    );
  }

  deleteDashboard(id: string): void {
    this.update((ds) => ds.filter((d) => d.id !== id));
  }

  private update(fn: (ds: Dashboard[]) => Dashboard[]): void {
    this._dashboards.update(fn);
    if (!this.browser) return;
    try {
      storage()?.setItem(STORAGE_KEY, JSON.stringify(this._dashboards()));
    } catch {
      // ponytail: quota/private mode: keep working in memory, just won't persist
    }
  }
}
