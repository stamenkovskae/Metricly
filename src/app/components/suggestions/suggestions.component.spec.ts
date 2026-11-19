import { TestBed } from '@angular/core/testing';
import { compile } from '../../query/compile';
import { ChartQuery } from '../../query/chart-query';
import { PRESETS, sameQuery } from './presets';
import { SuggestionsComponent } from './suggestions.component';

describe('suggestion presets', () => {
  it('has six presets that compile', () => {
    expect(PRESETS.length).toBe(6);
    for (const p of PRESETS) expect(compile(p.query)).toMatch(/http_server_request_duration/);
  });

  it('sameQuery ignores rangeMinutes and key order', () => {
    const q = PRESETS[1].query;
    expect(sameQuery({ ...q, rangeMinutes: 5 }, q)).toBe(true);
    expect(sameQuery({ ...q, splitBy: 'service' }, q)).toBe(false);
    expect(
      sameQuery(
        {
          look: 'bars',
          filters: [],
          speed: 'minute',
          metric: 'requests',
          splitBy: 'endpoint',
          rangeMinutes: 9,
        },
        q,
      ),
    ).toBe(true);
  });
});

describe('SuggestionsComponent', () => {
  it('highlights the matching tile and emits a copy on click', async () => {
    const fixture = TestBed.createComponent(SuggestionsComponent);
    fixture.componentRef.setInput('activeQuery', { ...PRESETS[1].query, rangeMinutes: 15 });
    await fixture.whenStable();
    const tiles: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('button.tile'),
    );
    expect(tiles.length).toBe(6);
    expect(tiles.map((t) => t.classList.contains('on'))).toEqual([
      false,
      true,
      false,
      false,
      false,
      false,
    ]);

    let got: ChartQuery | undefined;
    fixture.componentInstance.picked.subscribe((q) => (got = q));
    tiles[3].click();
    expect(got).toEqual(PRESETS[3].query);
    expect(got).not.toBe(PRESETS[3].query);
  });
});
