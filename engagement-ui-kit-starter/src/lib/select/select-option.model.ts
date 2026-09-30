/**
 * One choice in a `cw-select`.
 *
 * Options are passed as data rather than projected as content: the component
 * owns the list (ids, active option, type-ahead), so it needs the labels in
 * memory and needs to be able to re-render the popup without losing them.
 */
export interface CwSelectOption {
  /** Value written to the form control. Also the identity used for selection. */
  readonly value: string;

  /** Visible and accessible name of the option. */
  readonly label: string;

  /** Optional secondary line, e.g. a role or a team. */
  readonly description?: string;

  /**
   * Not selectable, e.g. a reviewer who is on leave. Rendered and announced as
   * unavailable (`aria-disabled`) and skipped by keyboard navigation.
   */
  readonly disabled?: boolean;
}
