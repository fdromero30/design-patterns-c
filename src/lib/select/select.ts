import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  forwardRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import type { CwSelectOption } from './select-option.model';

/** Consecutive keystrokes inside this window are treated as one type-ahead query. */
const TYPE_AHEAD_RESET_MS = 700;

/** How far PageUp/PageDown move the active option. */
const PAGE_SIZE = 10;

let nextSelectId = 0;

/**
 * A labelled single-select picker.
 *
 * Pattern: the ARIA APG *select-only combobox* (WAI-ARIA 1.2 `combobox`, popup
 * `listbox`). The trigger keeps DOM focus for the whole interaction and points
 * at the active option with `aria-activedescendant`, so focus is never handed
 * to the popup and can never be lost to the document; dismissing the list needs
 * no focus restoration because focus never left.
 *
 * Navigating the list only moves the active option. The value is committed with
 * Enter, Space, Tab or a click, and dismissed unchanged with Escape or a click
 * outside. Unavailable options are announced with `aria-disabled` and skipped
 * by navigation, like a native `<select>`.
 *
 * Value handling: the component is a `ControlValueAccessor`, so it works with
 * `[formControl]`, `formControlName` and `[(ngModel)]` - value, disabled state
 * and touched/dirty included. There is deliberately no second `value` input: one
 * source of truth for the value, the Angular forms API.
 *
 * Usage:
 * ```html
 * <cw-select label="Reviewer" [options]="reviewerOptions" [formControl]="reviewerId" />
 * ```
 *
 * Deliberately out of scope: multi-select, async option loading, virtual
 * scrolling, popup collision/flip handling and filtering by text (typing jumps
 * to a match instead; the popup is a plain listbox and never a search field).
 */
@Component({
  selector: 'cw-select',
  templateUrl: './select.html',
  styleUrl: './select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CwSelect), multi: true }],
  host: {
    '[attr.data-open]': 'isOpen() ? "" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class CwSelect implements ControlValueAccessor {
  /** Options to choose from. Order is rendered as given. */
  readonly options = input.required<readonly CwSelectOption[]>();

  /** Visible label, also the accessible name of the combobox. */
  readonly label = input.required<string>();

  /** Shown while nothing is selected. */
  readonly placeholder = input('Select an option');

  /** Id of the combobox element. Generated per instance when omitted. */
  readonly inputId = input<string | undefined>(undefined);

  /** Disables the control on top of the disabled state of the form control. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Sets `aria-invalid`. Validation itself belongs to the form. */
  readonly invalid = input(false, { transform: booleanAttribute });

  /** Emits whenever the popup opens or closes. */
  readonly openedChange = output<boolean>();

  private readonly idPrefix = `cw-select-${++nextSelectId}`;
  private readonly document = inject(DOCUMENT);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly triggerRef = viewChild<ElementRef<HTMLElement>>('trigger');

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};
  private typeBuffer = '';
  private typeBufferTimer: ReturnType<typeof setTimeout> | undefined;

  /** Current value. Written by the form control, never by the template. */
  protected readonly value = signal<string | null>(null);
  protected readonly formDisabled = signal(false);
  protected readonly isOpen = signal(false);
  protected readonly activeIndex = signal(-1);

  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());
  protected readonly labelId = computed(() => `${this.idPrefix}-label`);
  protected readonly triggerId = computed(() => this.inputId() ?? `${this.idPrefix}-trigger`);
  protected readonly listboxId = computed(() => `${this.idPrefix}-listbox`);
  protected readonly selectedLabel = computed(
    () => this.options().find((option) => option.value === this.value())?.label ?? '',
  );
  protected readonly activeDescendantId = computed(() =>
    this.isOpen() && this.activeIndex() >= 0 ? this.optionId(this.activeIndex()) : null,
  );

  /** Indices of the options that can actually be chosen. */
  private readonly selectableIndexes = computed(() =>
    this.options()
      .map((option, index) => (option.disabled ? -1 : index))
      .filter((index) => index >= 0),
  );

  // ControlValueAccessor -----------------------------------------------------

  writeValue(value: string | null): void {
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
    if (isDisabled) {
      this.close();
    }
  }

  // Template API -------------------------------------------------------------

  protected optionId(index: number): string {
    return `${this.idPrefix}-option-${index}`;
  }

  protected onTriggerClick(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  protected onTriggerBlur(): void {
    this.onTouched();
  }

  /**
   * Keyboard behaviour per the APG select-only combobox. DOM focus stays on the
   * trigger throughout, so every key is handled here.
   */
  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) {
      return;
    }

    const { key, altKey, ctrlKey, metaKey } = event;

    if (this.isOpen()) {
      switch (key) {
        case 'ArrowDown':
          this.preventDefault(event);
          this.moveActive(1);
          return;
        case 'ArrowUp':
          this.preventDefault(event);
          if (altKey) {
            this.commitActive();
          } else {
            this.moveActive(-1);
          }
          return;
        case 'PageDown':
          this.preventDefault(event);
          this.moveActiveBy(PAGE_SIZE);
          return;
        case 'PageUp':
          this.preventDefault(event);
          this.moveActiveBy(-PAGE_SIZE);
          return;
        case 'Home':
          this.preventDefault(event);
          this.moveActive(-this.options().length);
          return;
        case 'End':
          this.preventDefault(event);
          this.moveActive(this.options().length);
          return;
        case 'Enter':
        case ' ':
          this.preventDefault(event);
          this.commitActive();
          return;
        case 'Tab':
          // Commit and let the browser move focus on: matches a native select.
          this.commitActive();
          return;
        case 'Escape':
          event.stopPropagation();
          this.close();
          return;
        default:
          break;
      }
    } else {
      switch (key) {
        case 'ArrowDown':
        case 'Enter':
        case ' ':
          this.preventDefault(event);
          this.open();
          return;
        case 'ArrowUp':
        case 'Home':
          this.preventDefault(event);
          this.open();
          this.moveActive(-this.options().length);
          return;
        case 'End':
          this.preventDefault(event);
          this.open();
          this.moveActive(this.options().length);
          return;
        default:
          break;
      }
    }

    // Printable characters: open and jump to the first matching option.
    if (key.length === 1 && key !== ' ' && !altKey && !ctrlKey && !metaKey) {
      this.preventDefault(event);
      if (!this.isOpen()) {
        this.open();
      }
      this.typeAhead(key);
    }
  }

  /**
   * Clicking an option must not move focus out of the combobox: the popup is not
   * focusable, so without this the browser would move focus to the document.
   */
  protected onListboxMouseDown(event: MouseEvent): void {
    event.preventDefault();
  }

  protected onOptionClick(index: number): void {
    if (this.options()[index]?.disabled) {
      return;
    }
    this.activeIndex.set(index);
    this.commitActive();
  }

  /**
   * Outside click dismisses the list without changing the selection. Focus is
   * still on the trigger, which is the sensible place for it to stay.
   */
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) {
      return;
    }
    const target = event.target;
    if (target instanceof Node && this.host.nativeElement.contains(target)) {
      return;
    }
    this.close();
  }

  // Internals ---------------------------------------------------------------

  private open(): void {
    if (this.isOpen() || this.isDisabled()) {
      return;
    }
    this.isOpen.set(true);
    this.setActiveToSelectedOrFirst();
    this.openedChange.emit(true);
  }

  private close(): void {
    if (!this.isOpen()) {
      return;
    }
    this.isOpen.set(false);
    this.activeIndex.set(-1);
    this.openedChange.emit(false);
  }

  private commitActive(): void {
    const option = this.options()[this.activeIndex()];
    if (!option || option.disabled) {
      this.close();
      return;
    }
    this.value.set(option.value);
    this.onChange(option.value);
    this.close();
    this.triggerRef()?.nativeElement.focus();
  }

  /** Opens on the current value when there is one, otherwise on the first option. */
  private setActiveToSelectedOrFirst(): void {
    const selected = this.options().findIndex(
      (option) => option.value === this.value() && !option.disabled,
    );
    if (selected >= 0) {
      this.setActive(selected);
      return;
    }
    const selectable = this.selectableIndexes();
    this.setActive(selectable.length > 0 ? selectable[0] : -1);
  }

  /** Moves by a number of selectable options, skipping unavailable ones. */
  private moveActive(step: number): void {
    const selectable = this.selectableIndexes();
    if (selectable.length === 0) {
      return;
    }
    const current = selectable.indexOf(this.activeIndex());
    const next = current === -1 ? (step > 0 ? 0 : selectable.length - 1) : current + step;
    this.setActive(selectable[Math.min(Math.max(next, 0), selectable.length - 1)]);
  }

  /** Relative move that clamps at the ends (PageUp/PageDown). */
  private moveActiveBy(offset: number): void {
    const selectable = this.selectableIndexes();
    if (selectable.length === 0) {
      return;
    }
    const current = selectable.indexOf(this.activeIndex());
    const from = current === -1 ? 0 : current;
    this.setActive(selectable[Math.min(Math.max(from + offset, 0), selectable.length - 1)]);
  }

  private setActive(index: number): void {
    this.activeIndex.set(index);
    this.scrollActiveIntoView();
  }

  /**
   * Type-ahead jumps between matches instead of filtering: the popup stays a
   * plain listbox and the value keeps belonging to a closed set of options.
   */
  private typeAhead(character: string): void {
    clearTimeout(this.typeBufferTimer);
    this.typeBuffer += character.toLowerCase();
    this.typeBufferTimer = setTimeout(() => {
      this.typeBuffer = '';
    }, TYPE_AHEAD_RESET_MS);

    const options = this.options();
    const buffer = this.typeBuffer;
    // Pressing the same letter again (e.g. "c", "c") cycles through the matches
    // from the active option, like a native <select>, so the query collapses to
    // that one repeated letter. A fresh query searches from the top so the first
    // match wins; any other longer query looks for the full typed string.
    const isRepeated =
      buffer.length > 1 && [...buffer].every((character) => character === buffer[0]);
    const query = isRepeated ? buffer[0] : buffer;
    const from = isRepeated ? Math.max(this.activeIndex(), -1) + 1 : 0;
    for (let offset = 0; offset < options.length; offset++) {
      const index = (from + offset) % options.length;
      const option = options[index];
      if (!option.disabled && option.label.toLowerCase().startsWith(query)) {
        this.setActive(index);
        return;
      }
    }
  }

  /**
   * The active option has to be visible: assistive technology is told about it,
   * so it must not be scrolled out of sight. The optional call keeps jsdom-based
   * tests quiet, where `scrollIntoView` does not exist.
   */
  private scrollActiveIntoView(): void {
    const id = this.activeDescendantId();
    if (id === null) {
      return;
    }
    this.document.getElementById(id)?.scrollIntoView?.({ block: 'nearest' });
  }

  private preventDefault(event: KeyboardEvent): void {
    event.preventDefault();
  }
}
