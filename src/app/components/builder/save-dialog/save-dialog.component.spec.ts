import { stubLocalStorage } from '../../../dashboards/fake-storage';
import { Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DashboardStore } from '../../../dashboards/dashboard-store';
import { ChartQuery } from '../../../query/chart-query';
import { SaveDialogComponent } from './save-dialog.component';

const q: ChartQuery = { metric: 'requests', speed: 'minute', filters: [], look: 'line', rangeMinutes: 30 };

@Component({ imports: [SaveDialogComponent], template: `<app-save-dialog [query]="q" (saved)="msg = $event" />` })
class Host {
  q = q;
  msg = '';
  dlg = viewChild.required(SaveDialogComponent);
}

describe('SaveDialogComponent', () => {
  beforeEach(() => {
    stubLocalStorage();
    // jsdom has no <dialog> methods
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open'); };
  });

  const setup = () => {
    const f = TestBed.createComponent(Host);
    f.detectChanges();
    f.componentInstance.dlg().open();
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement, store: TestBed.inject(DashboardStore) };
  };
  const type = (input: HTMLInputElement, v: string) => { input.value = v; input.dispatchEvent(new Event('input')); };

  it('defaults the name to describe(query) and needs a dashboard name before saving', () => {
    const { f, el } = setup();
    const name = el.querySelector('input[name=title]') as HTMLInputElement;
    expect(name.value).toBe('Requests, per minute');
    const btn = el.querySelector('button[type=submit]') as HTMLButtonElement;
    f.detectChanges();
    expect(btn.disabled).toBe(true);
    type(el.querySelector('input[name=newName]')!, 'Ops');
    f.detectChanges();
    expect(btn.disabled).toBe(false);
  });

  it('saves into a new dashboard and announces it', () => {
    const { f, el, store } = setup();
    type(el.querySelector('input[name=newName]')!, 'Ops');
    f.detectChanges();
    (el.querySelector('button[type=submit]') as HTMLButtonElement).click();
    expect(store.dashboards()[0]).toMatchObject({ name: 'Ops', charts: [{ title: 'Requests, per minute' }] });
    expect(f.componentInstance.msg).toBe('Ops');
  });

  it('preselects an existing dashboard', () => {
    TestBed.inject(DashboardStore).save('x', q, { name: 'Existing' });
    const { f, el, store } = setup();
    expect(el.querySelector('input[name=newName]')).toBeNull();
    (el.querySelector('button[type=submit]') as HTMLButtonElement).click();
    expect(store.dashboards()).toHaveLength(1);
    expect(store.dashboards()[0].charts).toHaveLength(2);
    expect(f.componentInstance.msg).toBe('Existing');
  });
});
