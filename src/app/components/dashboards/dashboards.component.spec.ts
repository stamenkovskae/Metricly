import { stubLocalStorage } from '../../dashboards/fake-storage';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { vi } from 'vitest';
import { DashboardStore } from '../../dashboards/dashboard-store';
import { ChartQuery } from '../../query/chart-query';
import { QueryApi, QueryResponse } from '../../query/query-api';
import { DashboardsComponent } from './dashboards.component';

const q: ChartQuery = { metric: 'requests', speed: 'second', filters: [], look: 'line', rangeMinutes: 30 };

describe('DashboardsComponent', () => {
  let run: ReturnType<typeof vi.fn<(q: ChartQuery) => Observable<QueryResponse>>>;
  const setup = () => {
    stubLocalStorage();
    run = vi.fn(() => of({ promql: 'x', series: [{ label: 'a', points: [{ t: 1, v: 1 }] }] }));
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: QueryApi, useValue: { run } }] });
    const store = TestBed.inject(DashboardStore);
    const f = TestBed.createComponent(DashboardsComponent);
    f.detectChanges();
    return { f, store, el: f.nativeElement as HTMLElement };
  };

  it('teaches the first step and links to the builder when empty', () => {
    const { el } = setup();
    expect(el.textContent).toContain('No dashboards yet');
    expect(el.querySelector('a[href="/builder"]')).toBeTruthy();
  });

  it('renders saved charts live and deletes a chart', () => {
    const { f, store, el } = setup();
    store.save('Req', q, { name: 'Ops' });
    f.detectChanges();
    expect(el.textContent).toContain('Ops');
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ metric: 'requests' }));
    (el.querySelector('article .ghost') as HTMLButtonElement).click();
    f.detectChanges();
    expect(el.querySelector('article')).toBeNull();
  });

  it('asks before deleting a dashboard', () => {
    const { f, store, el } = setup();
    store.save('Req', q, { name: 'Ops' });
    f.detectChanges();
    const btn = el.querySelector('.dash > header .ghost') as HTMLButtonElement;
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValueOnce(false);
    btn.click();
    expect(store.dashboards()).toHaveLength(1);
    confirmSpy.mockReturnValueOnce(true);
    btn.click();
    expect(store.dashboards()).toHaveLength(0);
    confirmSpy.mockRestore();
  });
});
