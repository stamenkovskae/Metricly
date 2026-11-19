import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { DashboardStore } from '../../../dashboards/dashboard-store';
import { ChartQuery } from '../../../query/chart-query';
import { describe } from '../../../query/describe';

const NEW = '__new__';

/** Native <dialog>: name the chart, pick a dashboard (or make one), save. Call `open()` from the parent. */
@Component({
  selector: 'app-save-dialog',
  templateUrl: './save-dialog.component.html',
  styleUrl: './save-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaveDialogComponent {
  readonly query = input.required<ChartQuery>();
  readonly saved = output<string>(); // dashboard name

  protected readonly store = inject(DashboardStore);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  protected readonly title = signal('');
  protected readonly target = signal(NEW);
  protected readonly newName = signal('');
  protected readonly NEW = NEW;
  protected readonly canSave = computed(
    () => !!this.title().trim() && (this.target() !== NEW || !!this.newName().trim()),
  );

  open(): void {
    this.title.set(describe(this.query()));
    const ds = this.store.dashboards();
    this.target.set(ds.length ? ds[0].id : NEW);
    this.newName.set('');
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected save(): void {
    if (!this.canSave()) return;
    const t = this.target();
    const name = this.store.save(
      this.title().trim(),
      this.query(),
      t === NEW ? { name: this.newName().trim() } : { id: t },
    );
    this.close();
    this.saved.emit(name);
  }

  protected val(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }
}
