import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { QueryState } from '../query-state';
import { Block, chipLabel, cssKind, keyOf, blocksOf } from '../palette/blocks';

/** "Show me [Requests][per minute][by endpoint]": the blocks are the sentence. */
@Component({
  selector: 'app-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-canvas': '', '[class.over]': 'state.dragging()', 'aria-label': 'Your chart, as a sentence', role: 'group' },
  styles: `
    :host { background: var(--surface); border: 2px dashed var(--line); border-radius: 18px; padding: 14px 18px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    :host(.over) { border-color: var(--look-d); background: oklch(97% 0.02 245); }
    .lead { font-weight: 600; font-size: 17px; margin-right: 4px; }
    .chain { display: flex; align-items: center; }
    .chain .blk { font-size: 15px; padding: 9px 18px 9px 22px; cursor: default; }
    .chain .blk + .blk { margin-left: 4px; }
    .chain .blk::after { content: ''; position: absolute; right: -9px; top: 50%; width: 16px; height: 16px; margin-top: -8px; border-radius: 50%; background: inherit; z-index: 2; }
    .chain .blk:last-child::after { display: none; }
    .chain .blk + .blk::before { content: ''; position: absolute; left: -2px; top: 50%; width: 18px; height: 18px; margin-top: -9px; border-radius: 50%; background: var(--surface); z-index: 1; }
    .x { all: unset; cursor: pointer; opacity: 0.5; font-size: 12px; margin-left: 4px; border-radius: 6px; padding: 0 2px; }
    .x:hover { opacity: 1; }
    .x:focus-visible { outline: 3px solid var(--look-d); opacity: 1; }
    .slot { border: 2px dashed var(--line); border-radius: 12px; color: var(--muted); padding: 7px 14px; margin-left: 12px; }
    .tip { margin-left: auto; color: var(--muted); font-size: 12px; }
  `,
  template: `
    <span class="lead">Show me</span>
    @if (chips().length) {
      <div class="chain">
        @for (b of chips(); track key(b)) {
          <span class="blk k-{{ cssKind(b) }}">
            <b>{{ chipLabel(b) }}</b>
            <button type="button" class="x" [attr.aria-label]="'Remove ' + chipLabel(b)" (click)="state.remove(key(b))">✕</button>
          </span>
        }
      </div>
    }
    <span class="slot">+ drop a block</span>
    <span class="tip">Drag a block here, or just click it</span>
  `,
})
export class CanvasComponent {
  protected readonly state = inject(QueryState);
  protected readonly cssKind = cssKind;
  protected readonly chipLabel = chipLabel;
  protected readonly key = keyOf;
  // The default look (Line) stays implicit; every other block is a chip.
  protected readonly chips = computed<Block[]>(() => {
    const q = this.state.query();
    return q ? blocksOf(q).filter((b) => !(b.kind === 'look' && b.value === 'line')) : [];
  });
}
