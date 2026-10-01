import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
} from '@angular/core';

/** Processing state of an engagement, as the kit understands it. */
export type CwStatus = 'ready' | 'processing' | 'error' | 'unknown';

/** Visual density of a badge. */
export type CwSize = 'sm' | 'md' | 'lg';

const DEFAULT_LABEL: Record<CwStatus, string> = {
  ready: 'Ready',
  processing: 'Processing',
  error: 'Error',
  unknown: 'Unknown',
};

/**
 * Shows the processing state of an engagement.
 *
 * The visible text is the accessible text: the status is carried by the text,
 * never by the colour of the dot, which is decoration and hidden from assistive
 * technology. Pass `label` only when the status needs different wording, and
 * keep the wording descriptive of the status.
 *
 * The host element carries `data-status` and `data-size`. Those attributes are
 * the stable hooks for consumer styling and testing; the class names inside are
 * internal.
 *
 * Usage:
 * ```html
 * <cw-status-badge status="ready" />
 * <cw-status-badge status="processing" size="sm" [tooltip]="'Still preparing'" />
 * <cw-status-badge status="error" live />
 * ```
 *
 * Migrating from the previous API (breaking change):
 * `[isReady]` -> `status="ready"`, `[isProcessing]` -> `status="processing"`,
 * `[isError]` -> `status="error"`, `[isSmall]`/`[isLarge]` -> `size="sm"`/
 * `size="lg"`. `label` used to be mandatory and to duplicate the status; it is
 * now optional and defaults to the humanised status. The five booleans allowed
 * contradictory combinations (`[isReady]` and `[isError]` at once), which the
 * single `status` input makes unrepresentable.
 */
@Component({
  selector: 'cw-status-badge',
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-status]': 'status()',
    '[attr.data-size]': 'size()',
  },
})
export class StatusBadge {
  /** State the badge represents. Drives the palette. */
  readonly status = input<CwStatus>('unknown');

  /** Visual density. */
  readonly size = input<CwSize>('md');

  /** Visible text. Defaults to the humanised status. */
  readonly label = input<string | undefined>(undefined);

  /** Secondary help. Never the only carrier of meaning. */
  readonly tooltip = input<string | undefined>(undefined);

  /**
   * Announce status changes politely (`role="status"`). Off by default: a list
   * of badges would otherwise create one live region per badge and read the
   * whole list aloud on render.
   */
  readonly live = input(false, { transform: booleanAttribute });

  protected readonly text = computed(() => this.label()?.trim() || DEFAULT_LABEL[this.status()]);
}
