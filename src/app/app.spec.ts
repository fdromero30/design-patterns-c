import { TestBed } from '@angular/core/testing';

import { App } from './app';

/** Smoke test for the supplied workbench shell. */
describe('App', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders the workbench', async () => {
    TestBed.configureTestingModule({ imports: [App] });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('h1')?.textContent).toContain('Engagement UI kit');
  });

  it('applies the current theme to the document element and flips it on click', async () => {
    // The demo has to theme itself through the same attribute a consumer would
    // use, so this guards the documented mechanism, not just the demo markup.
    TestBed.configureTestingModule({ imports: [App] });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const html = document.documentElement;
    expect(html.dataset['cwTheme']).toBe('light');

    const toggle = (fixture.nativeElement as HTMLElement).querySelector(
      '.wb-theme-toggle',
    ) as HTMLButtonElement;

    toggle.click();
    fixture.detectChanges();
    expect(html.dataset['cwTheme']).toBe('dark');

    toggle.click();
    fixture.detectChanges();
    expect(html.dataset['cwTheme']).toBe('light');
  });
});
