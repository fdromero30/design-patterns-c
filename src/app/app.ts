import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { CwSelect, StatusBadge } from '../lib/public-api';
import type { CwSelectOption, CwStatus } from '../lib/public-api';
import { CHANGE_GROUPS, ENGAGEMENTS, REVIEWERS } from './data/engagement-fixtures';
import type { EngagementStatus } from './data/engagement-fixtures';

/** The kit's status names are lower case; the fixture data is upper case. */
const STATUS_MAP: Record<EngagementStatus, CwStatus> = {
  READY: 'ready',
  PROCESSING: 'processing',
  ERROR: 'error',
};

type CwTheme = 'light' | 'dark';

/**
 * The workbench: a consumer of the kit in `src/lib`.
 *
 * It exists so components can be built, demonstrated and reviewed in a running
 * application. Change it freely — it is a consumer, not part of the kit.
 */
@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, StatusBadge, CwSelect],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly document = inject(DOCUMENT);

  protected readonly engagements = ENGAGEMENTS;
  protected readonly statuses: readonly CwStatus[] = ['ready', 'processing', 'error', 'unknown'];

  /** A form control for the reviewer filter, wired to the kit's picker. */
  protected readonly reviewerId = new FormControl<string | null>(null);

  /** The same component used for something that is not a reviewer at all. */
  protected readonly changeGroup = new FormControl<string | null>(null);

  protected readonly reviewerOptions: readonly CwSelectOption[] = REVIEWERS.map((reviewer) => ({
    value: reviewer.id,
    label: reviewer.name,
    description: reviewer.role,
    disabled: reviewer.unavailable ?? false,
  }));

  protected readonly changeGroupOptions: readonly CwSelectOption[] = CHANGE_GROUPS.map((group) => ({
    value: group,
    label: group,
  }));

  /**
   * A deliberately large list. The picker has to stay correct with several
   * hundred options; nothing here is virtualised (out of scope by design).
   */
  protected readonly manyOptions: readonly CwSelectOption[] = Array.from(
    { length: 300 },
    (_, index) => ({
      value: `BULK-${index + 1}`,
      label: `Bulk reviewer ${index + 1}`,
      description: index % 7 === 0 ? 'On leave' : undefined,
      disabled: index % 7 === 0,
    }),
  );

  protected readonly manyReviewerId = new FormControl<string | null>(null);

  protected readonly theme = signal<CwTheme>('light');

  constructor() {
    this.applyTheme();
  }

  protected toggleTheme(): void {
    this.theme.update((theme) => (theme === 'light' ? 'dark' : 'light'));
    this.applyTheme();
  }

  protected toStatus(status: EngagementStatus): CwStatus {
    return STATUS_MAP[status];
  }

  /** Themes are selected with an attribute, so the workbench only flips one. */
  private applyTheme(): void {
    this.document.documentElement.dataset['cwTheme'] = this.theme();
  }
}
