import { stubLocalStorage } from './fake-storage';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ChartQuery } from '../query/chart-query';
import { DashboardStore, STORAGE_KEY } from './dashboard-store';

const q: ChartQuery = { metric: 'requests', speed: 'second', filters: [], look: 'line', rangeMinutes: 30 };
const make = (platform = 'browser') => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
  return TestBed.inject(DashboardStore);
};

describe('DashboardStore', () => {
  beforeEach(stubLocalStorage);

  it('saves to a new dashboard, then to an existing one, and persists', () => {
    const s = make();
    expect(s.save('A', q, { name: 'Ops' })).toBe('Ops');
    const id = s.dashboards()[0].id;
    expect(s.save('B', q, { id })).toBe('Ops');
    expect(s.dashboards()[0].charts.map((c) => c.title)).toEqual(['A', 'B']);
    expect(make().dashboards()[0].charts).toHaveLength(2); // reloaded from storage
  });

  it('deletes charts and dashboards', () => {
    const s = make();
    s.save('A', q, { name: 'Ops' });
    const d = s.dashboards()[0];
    s.deleteChart(d.id, d.charts[0].id);
    expect(s.dashboards()[0].charts).toHaveLength(0);
    s.deleteDashboard(d.id);
    expect(s.dashboards()).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]');
  });

  it('resets on corrupt JSON and wrong shapes without throwing', () => {
    localStorage.setItem(STORAGE_KEY, '{nope');
    expect(make().dashboards()).toEqual([]);
    localStorage.setItem(STORAGE_KEY, '{"a":1}');
    expect(make().dashboards()).toEqual([]);
  });

  it('drops saved charts that lack a metric', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ id: 'd', name: 'D', charts: [{ id: 'x', title: 't', query: { look: 'line' } }, { id: 'y', title: 't', query: q }] }]),
    );
    expect(make().dashboards()[0].charts.map((c) => c.id)).toEqual(['y']);
  });

  it('is a no-op on the server', () => {
    const spy = vi.spyOn(localStorage, 'getItem');
    const s = make('server');
    s.save('A', q, { name: 'Ops' });
    expect(spy).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    spy.mockRestore();
  });
});
