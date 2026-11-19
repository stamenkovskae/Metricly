import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { DashboardStore } from '../../dashboards/dashboard-store';
import { ChartQuery } from '../../query/chart-query';
import { QueryApi } from '../../query/query-api';
import { QueryState } from '../builder/query-state';
import { PRESETS } from '../suggestions/presets';
import { recipeId } from './recipe-id';

/** Smallest valid query: it only has to prove the server and Prometheus answer. */
const PING: ChartQuery = { metric: 'requests', speed: 'minute', filters: [], look: 'number', rangeMinutes: 5 };

type Connection = 'checking' | 'ok' | 'down';

/** The front door: welcome, getting-started steps that tick themselves off, saved dashboards, recipes. */
@Component({
  imports: [RouterLink],
  selector: 'app-home',
  styleUrl: './home.component.css',
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly api = inject(QueryApi);
  protected readonly store = inject(DashboardStore);
  private readonly state = inject(QueryState);

  protected readonly recipes = PRESETS.map((p) => ({ ...p, id: recipeId(p.name) }));
  protected readonly connection = signal<Connection>('checking');
  private check?: Subscription;

  private readonly hasChart = computed(
    () => !!this.state.query() || this.store.dashboards().some((d) => d.charts.length > 0),
  );
  private readonly hasDashboard = computed(() => this.store.dashboards().length > 0);

  protected readonly steps = computed(() => {
    const conn = this.connection();
    return [
      {
        id: 'connect',
        title: 'Connect your data',
        done: conn === 'ok',
        // null = still checking (the template shows a skeleton line)
        text:
          conn === 'ok' ? 'Connected. Prometheus is answering.'
          : conn === 'down' ? "Prometheus isn't answering."
          : null,
      },
      {
        id: 'chart',
        title: 'Make your first chart',
        done: this.hasChart(),
        text: this.hasChart() ? "You've built a chart." : 'Click a block, like Requests, and the chart appears.',
        action: 'Make a chart',
      },
      {
        id: 'save',
        title: 'Save it to a dashboard',
        done: this.hasDashboard(),
        text: this.hasDashboard() ? 'Your chart has a home.' : 'Keep the charts you check often in one place.',
        action: 'Save a chart',
      },
    ];
  });

  /** Once everything works the panel steps aside, but never while the connection is broken. */
  protected readonly finished = computed(
    () => this.hasChart() && this.hasDashboard() && this.connection() !== 'down',
  );
  protected readonly reopened = signal(false);
  protected readonly showSteps = computed(() => !this.finished() || this.reopened());

  constructor() {
    // ponytail: prerender never pings Prometheus; the check starts in the browser only.
    if (isPlatformBrowser(inject(PLATFORM_ID))) this.checkConnection();
    inject(DestroyRef).onDestroy(() => this.check?.unsubscribe());
  }

  protected checkConnection() {
    this.connection.set('checking');
    this.check?.unsubscribe();
    this.check = this.api.run(PING).subscribe({
      next: () => this.connection.set('ok'),
      error: () => this.connection.set('down'),
    });
  }

  protected chartCount(n: number) {
    return n === 0 ? 'No charts yet' : n === 1 ? '1 chart' : `${n} charts`;
  }
}
