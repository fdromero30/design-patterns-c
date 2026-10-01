import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

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

  it('moves the active option without committing a value', () => {
    key(trigger, 'ArrowDown');
    fixture.detectChanges();
    key(trigger, 'ArrowDown');
    fixture.detectChanges();

    expect(activeOptionText(host, trigger)).toBe('Carla');
    expect(fixture.componentInstance.control.value).toBeNull();
    expect(fixture.componentInstance.control.dirty).toBe(false);
  });

  it('ignores a click on an unavailable option and keeps the list open', () => {
    document.body.appendChild(host);
    try {
      key(trigger, 'ArrowDown');
      fixture.detectChanges();

      const bruno = optionWithLabel(host, 'Bruno');
      bruno.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(fixture.componentInstance.control.value).toBeNull();
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    } finally {
      host.remove();
    }
  });

  it('blocks opening and keyboard input when the form control is disabled', async () => {
    fixture.componentInstance.control.disable();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(trigger.getAttribute('tabindex')).toBe('-1');
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
    expect((host.querySelector('cw-select') as HTMLElement).hasAttribute('data-disabled')).toBe(
      true,
    );

    key(trigger, 'ArrowDown');
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('[role="listbox"]')).toBeNull();
  });

  it('shows the placeholder when the value is not among the options', async () => {
    fixture.componentInstance.control.setValue('zzz');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(trigger.textContent).toContain('Select an option');
    expect(host.querySelector('[role="option"]')).toBeNull();
  });

  it('commits on Tab and leaves focus navigation to the browser', () => {
    key(trigger, 'ArrowDown');
    fixture.detectChanges();

    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    trigger.dispatchEvent(tab);
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe('a');
    expect(tab.defaultPrevented).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('jumps to the first and last available option with Home and End', () => {
    key(trigger, 'ArrowDown');
    fixture.detectChanges();

    key(trigger, 'End');
    fixture.detectChanges();
    expect(activeOptionText(host, trigger)).toBe('Carla');

    key(trigger, 'Home');
    fixture.detectChanges();
    expect(activeOptionText(host, trigger)).toBe('Ana');
  });
});

/**
 * Type-ahead, large lists, two pickers on one page and the template-driven
 * binding each need a host shaped for that case.
 */
@Component({
  selector: 'test-type-ahead-host',
  imports: [ReactiveFormsModule, CwSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<cw-select label="Reviewer" [options]="options" [formControl]="control" />`,
})
class TypeAheadHostComponent {
  readonly options: readonly CwSelectOption[] = [
    { value: 'carla', label: 'Carla' },
    { value: 'cesar', label: 'Cesar' },
  ];
  readonly control = new FormControl<string | null>(null);
}

describe('CwSelect type-ahead', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TypeAheadHostComponent>>;
  let host: HTMLElement;
  let trigger: HTMLElement;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [TypeAheadHostComponent] });
    fixture = TestBed.createComponent(TypeAheadHostComponent);
    await fixture.whenStable();
    host = fixture.nativeElement as HTMLElement;
    trigger = host.querySelector('[role="combobox"]') as HTMLElement;
  });

  it('jumps to the first option a single letter matches', () => {
    // "Carla" is first, so a fresh "c" must land there and not skip past it.
    key(trigger, 'c');
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(activeOptionText(host, trigger)).toBe('Carla');
  });

  it('matches the whole typed prefix, not just the first letter', () => {
    key(trigger, 'c');
    fixture.detectChanges();
    key(trigger, 'e');
    fixture.detectChanges();

    expect(activeOptionText(host, trigger)).toBe('Cesar');
  });

  it('cycles through the matches when the same letter is pressed again', () => {
    key(trigger, 'c');
    fixture.detectChanges();
    expect(activeOptionText(host, trigger)).toBe('Carla');

    key(trigger, 'c');
    fixture.detectChanges();
    expect(activeOptionText(host, trigger)).toBe('Cesar');
  });
});

@Component({
  selector: 'test-many-options-host',
  imports: [ReactiveFormsModule, CwSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<cw-select label="Bulk reviewer" [options]="options" [formControl]="control" />`,
})
class ManyOptionsHostComponent {
  readonly options: readonly CwSelectOption[] = Array.from({ length: 300 }, (_, index) => ({
    value: `BULK-${index + 1}`,
    label: `Bulk reviewer ${index + 1}`,
    disabled: index % 7 === 0,
  }));
  readonly control = new FormControl<string | null>(null);
}

describe('CwSelect with several hundred options', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ManyOptionsHostComponent>>;
  let host: HTMLElement;
  let trigger: HTMLElement;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [ManyOptionsHostComponent] });
    fixture = TestBed.createComponent(ManyOptionsHostComponent);
    await fixture.whenStable();
    host = fixture.nativeElement as HTMLElement;
    trigger = host.querySelector('[role="combobox"]') as HTMLElement;
  });

  it('reaches the last option with End, announces it and scrolls it into view', () => {
    // jsdom has no scrollIntoView, so it is stubbed to observe the call. The
    // host is attached to the document so getElementById can find the option.
    const original = Element.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView as unknown as typeof original;

    document.body.appendChild(host);
    try {
      key(trigger, 'ArrowDown');
      fixture.detectChanges();

      scrollIntoView.mockClear();
      key(trigger, 'End');
      fixture.detectChanges();

      const activeId = trigger.getAttribute('aria-activedescendant');
      const active = host.querySelector<HTMLElement>(`[role="option"][id="${activeId}"]`);

      expect(active?.textContent).toContain('Bulk reviewer 300');
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    } finally {
      host.remove();
      Element.prototype.scrollIntoView = original;
    }
  });
});

@Component({
  selector: 'test-two-pickers-host',
  imports: [ReactiveFormsModule, CwSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cw-select label="First" [options]="options" [formControl]="first" />
    <cw-select label="Second" [options]="options" [formControl]="second" />
  `,
})
class TwoPickersHostComponent {
  readonly options: readonly CwSelectOption[] = [
    { value: 'a', label: 'Ana' },
    { value: 'b', label: 'Bruno' },
    { value: 'c', label: 'Carla' },
  ];
  readonly first = new FormControl<string | null>(null);
  readonly second = new FormControl<string | null>(null);
}

describe('CwSelect with two instances on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoPickersHostComponent>>;
  let host: HTMLElement;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [TwoPickersHostComponent] });
    fixture = TestBed.createComponent(TwoPickersHostComponent);
    await fixture.whenStable();
    host = fixture.nativeElement as HTMLElement;
  });

  it('keeps each picker on its own aria ids and list', () => {
    const [first, second] = [...host.querySelectorAll<HTMLElement>('[role="combobox"]')];

    expect(first.id).not.toBe(second.id);
    expect(first.getAttribute('aria-controls')).not.toBe(second.getAttribute('aria-controls'));

    key(second, 'ArrowDown');
    fixture.detectChanges();

    const activeId = second.getAttribute('aria-activedescendant');
    expect(activeId).toBeTruthy();

    // The active option resolves inside the second picker and nowhere in the first.
    expect(second.closest('cw-select')?.querySelector(`[id="${activeId}"]`)?.textContent).toContain(
      'Ana',
    );
    expect(first.closest('cw-select')?.querySelector(`[id="${activeId}"]`)).toBeNull();

    // Opening the second picker leaves the first one closed and empty.
    expect(first.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.second.value).toBeNull();
  });
});

@Component({
  selector: 'test-ng-model-host',
  imports: [FormsModule, CwSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<cw-select label="Reviewer" [options]="options" [(ngModel)]="value" />`,
})
class NgModelHostComponent {
  readonly options: readonly CwSelectOption[] = [
    { value: 'a', label: 'Ana' },
    { value: 'b', label: 'Bruno', disabled: true },
    { value: 'c', label: 'Carla' },
  ];
  value: string | null = null;
}

describe('CwSelect with a template-driven binding', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<NgModelHostComponent>>;
  let host: HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [NgModelHostComponent] });
    fixture = TestBed.createComponent(NgModelHostComponent);
    host = fixture.nativeElement as HTMLElement;
  });

  const combobox = () => host.querySelector('[role="combobox"]') as HTMLElement;

  it('shows the value the model was seeded with', async () => {
    // Seeded before the first change detection, the way a consumer that already
    // has a model renders. NgModel writes the value through during that pass, so
    // the resulting render is flushed by the next check (a running app does that
    // automatically via ApplicationRef.tick).
    fixture.componentInstance.value = 'c';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(combobox().textContent).toContain('Carla');
  });

  it('writes the chosen option back to the model', () => {
    fixture.detectChanges();
    const trigger = combobox();

    key(trigger, 'ArrowDown');
    fixture.detectChanges();
    key(trigger, 'ArrowDown');
    fixture.detectChanges();
    key(trigger, 'Enter');
    fixture.detectChanges();

    expect(fixture.componentInstance.value).toBe('c');
    expect(trigger.textContent).toContain('Carla');
  });
});
