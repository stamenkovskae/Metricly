import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, effect, inject, input, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ChartSeries } from '../../chart/chart-series';
import { ChartQuery } from '../../query/chart-query';
import { QueryApi } from '../../query/query-api';
import { ChartComponent } from '../chart/chart.component';

/** One saved chart, fetched live. Runs only in the browser; each query change cancels the previous request. */
@Component({
  selector: 'app-saved-chart',
  imports: [ChartComponent],
  template: `<app-chart [series]="series()" [look]="query().look" [unit]="unit()" [loading]="loading()" [error]="error()" (retry)="load()" />`,
  styles: `:host { display: block; height: 240px; padding-bottom: 8px; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavedChartComponent {
  readonly query = input.required<ChartQuery>();
  private readonly api = inject(QueryApi);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly series = signal<ChartSeries[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly unit = computed(() => {
    const q = this.query();
    if (q.metric === 'responseTime') return 'seconds';
    if (q.metric === 'errorRate') return '%';
    return `${q.metric} per ${q.speed ?? 'second'}`;
  });

  constructor() {
    effect((onCleanup) => {
      this.query(); // dependency
      const sub = this.load();
      onCleanup(() => sub?.unsubscribe());
    });
  }

  protected load() {
    if (!this.browser) return;
    this.loading.set(true);
    this.error.set(null);
    return this.api.run(this.query()).subscribe({
      next: (r) => { this.series.set(r.series); this.loading.set(false); },
      error: (e: Error) => { this.series.set([]); this.error.set(e.message); this.loading.set(false); },
    });
  }
}
