import { CdkDrag, CdkDragEnd } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { QueryState, isDisabled, isUsed } from '../query-state';
import { Block, GROUPS, cssKind, label } from './blocks';

/** Left palette. Blocks can be clicked, activated with Enter/Space, or dragged onto `[data-canvas]`. */
@Component({
  selector: 'app-palette',
  imports: [CdkDrag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: flex; flex-direction: column; gap: 14px; background: var(--panel); padding: 16px 16px 20px; }
    h2 { font-size: 13px; font-weight: 600; margin: 0 0 8px; display: flex; align-items: center; gap: 8px; }
    h2 u { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .blocks { display: flex; flex-wrap: wrap; gap: 8px; }
    .blk:disabled { opacity: 0.35; cursor: not-allowed; box-shadow: none; transform: none; }
  `,
  template: `
    @for (g of groups; track g.title) {
      <section>
        <h2><u [style.background]="'var(--' + g.kind + ')'"></u>{{ g.title }}</h2>
        <div class="blocks">
          @for (b of g.blocks; track label(b)) {
            <button
              type="button"
              class="blk k-{{ cssKind(b) }}"
              [class.used]="isUsed(state.query(), b)"
              [disabled]="isDisabled(state.query(), b)"
              [cdkDragDisabled]="isDisabled(state.query(), b)"
              cdkDrag
              (cdkDragStarted)="state.dragging.set(true)"
              (cdkDragEnded)="dropped($event, b)"
              (click)="state.add(b)"
            >{{ label(b) }}</button>
          }
        </div>
      </section>
    }
  `,
})
export class PaletteComponent {
  protected readonly state = inject(QueryState);
  protected readonly groups = GROUPS;
  protected readonly label = label;
  protected readonly cssKind = cssKind;
  protected readonly isUsed = isUsed;
  protected readonly isDisabled = isDisabled;

  protected dropped(e: CdkDragEnd, b: Block) {
    this.state.dragging.set(false);
    // Dropped on the canvas? (hit-test by point, so the page needs no wiring between palette and canvas)
    const hit = document.elementFromPoint(e.dropPoint.x, e.dropPoint.y);
    if (hit?.closest('[data-canvas]')) this.state.add(b);
    e.source.reset(); // snap the block back to the palette
  }
}
