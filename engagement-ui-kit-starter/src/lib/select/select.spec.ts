import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { CwSelect } from './select';
import type { CwSelectOption } from './select-option.model';

/**
 * Seed of the picker's test suite: the cases where a regression reaches a user
 * (ARIA state, keyboard behaviour, form integration) rather than markup detail.
 */
@Component({
  imports: [ReactiveFormsModule, CwSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<cw-select label="Reviewer" [options]="options" [formControl]="control" />`,
})
class HostComponent {
  readonly options: readonly CwSelectOption[] = [
    { value: 'a', label: 'Ana' },
    { value: 'b', label: 'Bruno', disabled: true },
    { value: 'c', label: 'Carla' },
  ];
  readonly control = new FormControl<string | null>(null);
}

function key(target: HTMLElement, keyName: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true }));
}

function activeOptionText(host: HTMLElement, trigger: HTMLElement): string {
  const id = trigger.getAttribute('aria-activedescendant');
  return host.querySelector(`[role="option"][id="${id}"]`)?.textContent?.trim() ?? '';
}

function optionWithLabel(host: HTMLElement, label: string): HTMLElement {
  return [...host.querySelectorAll('[role="option"]')].find((element) =>
    element.textContent?.includes(label),
  ) as HTMLElement;
}

describe('CwSelect', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<HostComponent>>;
  let host: HTMLElement;
  let trigger: HTMLElement;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    host = fixture.nativeElement as HTMLElement;
    trigger = host.querySelector('[role="combobox"]') as HTMLElement;
  });

  it('is a labelled combobox showing the placeholder and no list', () => {
    const labelId = trigger.getAttribute('aria-labelledby');

    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(host.querySelector(`#${labelId}`)?.textContent?.trim()).toBe('Reviewer');
    expect(trigger.textContent).toContain('Select an option');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('[role="listbox"]')).toBeNull();
  });

  it('opens on ArrowDown, announces the list, and skips unavailable options', async () => {
    key(trigger, 'ArrowDown');
    fixture.detectChanges();

    const listbox = host.querySelector('[role="listbox"]');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(listbox?.id).toBe(trigger.getAttribute('aria-controls'));
    expect(activeOptionText(host, trigger)).toBe('Ana');

    // Bruno is unavailable: navigation and the accessible state both say so.
    expect(host.querySelector('[role="option"][aria-disabled="true"]')?.textContent).toContain(
      'Bruno',
    );

    key(trigger, 'ArrowDown');
    fixture.detectChanges();
    expect(activeOptionText(host, trigger)).toBe('Carla');
  });

  it('writes the active option to the form control on Enter and closes', async () => {
    key(trigger, 'ArrowDown');
    fixture.detectChanges();
    key(trigger, 'ArrowDown');
    fixture.detectChanges();
    key(trigger, 'Enter');
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe('c');
    expect(fixture.componentInstance.control.dirty).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.textContent).toContain('Carla');
  });

  it('dismisses with Escape without changing the value and keeps focus in the component', async () => {
    document.body.appendChild(host);
    try {
      trigger.focus();
      key(trigger, 'ArrowDown');
      fixture.detectChanges();
      key(trigger, 'ArrowDown');
      fixture.detectChanges();
      key(trigger, 'Escape');
      fixture.detectChanges();

      expect(fixture.componentInstance.control.value).toBeNull();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(trigger.hasAttribute('aria-activedescendant')).toBe(false);
      expect(document.activeElement).toBe(trigger);
    } finally {
      host.remove();
    }
  });

  it('commits on click and closes, without moving focus out of the control', async () => {
    document.body.appendChild(host);
    try {
      trigger.focus();
      key(trigger, 'ArrowDown');
      fixture.detectChanges();

      const option = optionWithLabel(host, 'Carla');
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      option.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(fixture.componentInstance.control.value).toBe('c');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(trigger);
    } finally {
      host.remove();
    }
  });

  it('dismisses on an outside click without changing the selection', async () => {
    document.body.appendChild(host);
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    try {
      trigger.focus();
      key(trigger, 'ArrowDown');
      fixture.detectChanges();
      key(trigger, 'ArrowDown');
      fixture.detectChanges();

      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(fixture.componentInstance.control.value).toBeNull();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    } finally {
      outside.remove();
      host.remove();
    }
  });

  it('reports touched when focus leaves the control', async () => {
    trigger.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.touched).toBe(true);
  });

  it('reflects a value written by the form control', async () => {
    fixture.componentInstance.control.setValue('c');
    await fixture.whenStable();

    expect(trigger.textContent).toContain('Carla');
    expect(host.querySelector('[role="option"][aria-selected="true"]')).toBeNull();

    key(trigger, 'ArrowDown');
    fixture.detectChanges();
    expect(host.querySelector('[role="option"][aria-selected="true"]')?.textContent).toContain(
      'Carla',
    );
    expect(activeOptionText(host, trigger)).toBe('Carla');
  });
});
