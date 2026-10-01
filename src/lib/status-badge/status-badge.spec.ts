import { TestBed } from '@angular/core/testing';

import { StatusBadge } from './status-badge';

/**
 * Focused on the behaviour a regression would take to a user: a badge that is
 * silent for assistive technology, or a theme hook that stops being emitted.
 */
describe('StatusBadge', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [StatusBadge] });
  });

  async function render(status: string, extra: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentRef.setInput('status', status);
    for (const [name, value] of Object.entries(extra)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('exposes the status text to assistive technology and hides the dot', async () => {
    const host = await render('processing');

    const label = host.querySelector('.cw-status-badge__label');
    expect(label?.textContent?.trim()).toBe('Processing');
    expect(label?.hasAttribute('aria-hidden')).toBe(false);
    expect(host.querySelector('.cw-status-badge__dot')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('mirrors status and size on the host as the public styling hooks', async () => {
    const host = await render('error', { size: 'lg' });

    expect(host.getAttribute('data-status')).toBe('error');
    expect(host.getAttribute('data-size')).toBe('lg');
  });

  it('defaults the label to the status and lets a consumer label win', async () => {
    expect((await render('ready')).textContent).toContain('Ready');
    expect((await render('ready', { label: 'Cleared for review' })).textContent).toContain(
      'Cleared for review',
    );
  });

  it('only becomes a live region when asked', async () => {
    const quiet = await render('ready');
    expect(quiet.querySelector('.cw-status-badge')?.getAttribute('role')).toBeNull();

    const live = await render('ready', { live: true });
    expect(live.querySelector('.cw-status-badge')?.getAttribute('role')).toBe('status');
  });

  it('only emits a title attribute when a tooltip is given', async () => {
    // `title=""` is announced as an empty tooltip, so the attribute must be
    // absent rather than empty when there is nothing to say.
    const plain = await render('ready');
    expect(plain.querySelector('.cw-status-badge')?.hasAttribute('title')).toBe(false);

    const withTooltip = await render('ready', { tooltip: 'Still preparing' });
    expect(withTooltip.querySelector('.cw-status-badge')?.getAttribute('title')).toBe(
      'Still preparing',
    );
  });
});
