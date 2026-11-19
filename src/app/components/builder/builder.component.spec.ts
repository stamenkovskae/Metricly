import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { ChartQuery } from '../../query/chart-query';
import { QueryApi, QueryResponse } from '../../query/query-api';
import { BuilderComponent } from './builder.component';
import { QueryState } from './query-state';

const reply = (label = 'requests'): QueryResponse => ({
  promql: 'sum (rate(x[5m]))',
  series: [{ label, points: [{ t: 1000, v: 1 }, { t: 2000, v: NaN }] }],
});

describe('BuilderComponent', () => {
  let run: ReturnType<typeof vi.fn<(q: ChartQuery) => Observable<QueryResponse>>>;
  const setup = () => {
    vi.useFakeTimers();
    run = vi.fn<(q: ChartQuery) => Observable<QueryResponse>>(() => of(reply()));
    TestBed.configureTestingModule({
      imports: [BuilderComponent],
      providers: [{ provide: QueryApi, useValue: { run } }],
    });
    const fixture = TestBed.createComponent(BuilderComponent);
    const state = TestBed.inject(QueryState);
    // 250ms debounce, then let rendering settle
    const settle = async () => {
      fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(300);
      fixture.detectChanges();
    };
    return { fixture, state, el: fixture.nativeElement as HTMLElement, settle };
  };
  afterEach(() => vi.useRealTimers());

  it('shows the teaching empty state and does not query before a metric is picked', async () => {
    const { el, settle } = setup();
    await settle();
    expect(el.textContent).toContain('Drag a block here, or click one to start');
    expect(run).not.toHaveBeenCalled();
  });

  it('queries once for a burst of changes and shows the PromQL', async () => {
    const { el, state, settle } = setup();
    await settle();
    state.add({ kind: 'metric', value: 'requests' });
    state.add({ kind: 'speed', value: 'minute' });
    await settle();
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][0]).toMatchObject({ metric: 'requests', speed: 'minute' });
    expect(el.querySelector('canvas')).toBeTruthy();
    expect(el.querySelector('.peek code')?.textContent).toContain('sum (rate(x[5m]))');
    expect(el.querySelector('.says')?.textContent).toContain('Requests, per minute');
  });

  it('time-range buttons update rangeMinutes and re-query', async () => {
    const { el, state, settle } = setup();
    state.add({ kind: 'metric', value: 'requests' });
    await settle();
    (el.querySelectorAll('.seg button')[3] as HTMLButtonElement).click();
    await settle();
    expect(state.query()?.rangeMinutes).toBe(360);
    expect(run.mock.calls.at(-1)![0].rangeMinutes).toBe(360);
  });

  it('keeps the old chart while loading and drops a superseded request', async () => {
    const { el, fixture, state, settle } = setup();
    state.add({ kind: 'metric', value: 'requests' });
    await settle();
    const slow = new Subject<QueryResponse>();
    let unsubscribed = false;
    run.mockImplementationOnce(() => new Observable<QueryResponse>((s) => {
      slow.subscribe(s);
      return () => (unsubscribed = true);
    }));
    state.add({ kind: 'look', value: 'bars' });
    await settle();
    expect(el.querySelector('.chart-box')?.classList.contains('stale')).toBe(true);
    expect(el.querySelector('canvas')).toBeTruthy(); // old chart still there
    state.add({ kind: 'look', value: 'area' });
    await settle();
    expect(unsubscribed).toBe(true); // in-flight request was cancelled
    expect(fixture.nativeElement.querySelector('.chart-box')?.classList.contains('stale')).toBe(false);
  });

  it('shows the error and retries', async () => {
    const { el, state, settle } = setup();
    run.mockReturnValueOnce(new Observable((s) => s.error(new Error("Can't reach Prometheus right now."))));
    state.add({ kind: 'metric', value: 'requests' });
    await settle();
    expect(el.querySelector('[role=alert]')?.textContent).toContain("Can't reach Prometheus");
    (el.querySelector('[role=alert] button') as HTMLButtonElement).click();
    await settle();
    expect(run).toHaveBeenCalledTimes(2);
    expect(el.querySelector('[role=alert]')).toBeNull();
  });

  it('gallery pick loads the preset as the current query', async () => {
    const { el, state, settle } = setup();
    await settle();
    (el.querySelector('app-suggestions .tile') as HTMLButtonElement).click();
    await settle();
    expect(state.query()).not.toBeNull();
    expect(run).toHaveBeenCalledTimes(1);
  });
});
