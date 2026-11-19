import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, debounceTime, finalize, map, merge, switchMap, tap } from 'rxjs';
import { ChartSeries } from '../../chart/chart-series';
import { describe } from '../../query/describe';
import { QueryApi } from '../../query/query-api';
import { ChartComponent } from '../chart/chart.component';
import { SaveDialogComponent } from './save-dialog/save-dialog.component';
import { recipeId } from '../home/recipe-id';
import { PRESETS } from '../suggestions/presets';
import { SuggestionsComponent } from '../suggestions/suggestions.component';
import { CanvasComponent } from './canvas/canvas.component';
import { PaletteComponent } from './palette/palette.component';
import { QueryState } from './query-state';

const RANGES = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '6 hours', minutes: 360 },
];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** The builder page: blocks in, chart out. Re-queries (debounced, cancelling) whenever the query changes. */
@Component({
  selector: 'app-builder',
  imports: [PaletteComponent, CanvasComponent, ChartComponent, SuggestionsComponent, SaveDialogComponent],
  templateUrl: './builder.component.html',
  styleUrl: './builder.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuilderComponent {
  protected readonly state = inject(QueryState);
  private readonly api = inject(QueryApi);

  protected readonly ranges = RANGES;
  protected readonly describe = describe;

  protected readonly series = signal<ChartSeries[]>([]);
  protected readonly promql = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);
  // Keep the old chart on screen while refreshing; only show the skeleton when there is nothing to keep.
  protected readonly skeleton = computed(() => this.loading() && !this.series().length);

  protected readonly unit = computed(() => {
    const q = this.state.query();
    if (!q) return '';
    if (q.metric === 'responseTime') return 'seconds';
    if (q.metric === 'errorRate') return '%';
    return `${q.metric} per ${q.speed ?? 'second'}`;
  });
  protected readonly title = computed(() => {
    const q = this.state.query();
    if (!q) return '';
    if (q.metric === 'responseTime') return 'Response time';
    if (q.metric === 'errorRate') return 'Error rate';
    return cap(this.unit());
  });

  private readonly retry$ = new Subject<void>();

  constructor() {
    // ponytail: prerender never has a query, but keep fetch out of the server path regardless.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    // Home links here with ?recipe=<id>: load that preset once; unknown ids are ignored.
    const recipe = inject(ActivatedRoute, { optional: true })?.snapshot.queryParamMap.get('recipe');
    const preset = PRESETS.find((p) => recipeId(p.name) === recipe);
    if (preset) this.state.load(structuredClone(preset.query));
    merge(
      toObservable(this.state.query).pipe(debounceTime(250)),
      this.retry$.pipe(map(() => this.state.query())),
    )
      .pipe(
        switchMap((q) => {
          if (!q) {
            this.reset(); // also cancels any request still in flight
            return EMPTY;
          }
          this.loading.set(true);
          this.error.set(null);
          return this.api.run(q).pipe(
            tap((r) => {
              this.series.set(r.series);
              this.promql.set(r.promql);
            }),
            catchError((e: Error) => {
              this.series.set([]);
              this.error.set(e.message);
              return EMPTY;
            }),
            // switchMap unsubscribes (aborts the fetch) before starting the next one
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  protected readonly savedTo = signal('');
  private readonly saveDialog = viewChild(SaveDialogComponent);

  protected openSave() {
    this.saveDialog()?.open();
  }

  protected setRange(rangeMinutes: number) {
    const q = this.state.query();
    if (q) this.state.load({ ...q, rangeMinutes });
  }

  protected retry() {
    this.retry$.next();
  }

  private reset() {
    this.series.set([]);
    this.promql.set('');
    this.error.set(null);
    this.loading.set(false);
  }
}
