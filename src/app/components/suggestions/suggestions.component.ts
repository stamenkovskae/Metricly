import { Component, input, output } from '@angular/core';
import { ChartQuery } from '../../query/chart-query';
import { PRESETS, sameQuery } from './presets';

@Component({
  selector: 'app-suggestions',
  templateUrl: './suggestions.component.html',
  styleUrl: './suggestions.component.css',
})
export class SuggestionsComponent {
  readonly activeQuery = input<ChartQuery | null>(null);
  readonly picked = output<ChartQuery>();
  readonly presets = PRESETS;

  isActive(q: ChartQuery): boolean {
    const a = this.activeQuery();
    return !!a && sameQuery(a, q);
  }

  pick(q: ChartQuery) {
    // copy so the builder can't mutate the preset
    this.picked.emit(structuredClone(q));
  }
}
