/**
 * The public surface of the UI kit.
 *
 * Anything the demo application (or any other consumer) imports comes from
 * here. Consumers should never need to reach into a component folder directly.
 *
 * Types are exported with `export type` so the entry point stays compatible with
 * `isolatedModules` and can be consumed by any bundler.
 */

export { CwSelect } from './select/select';
export type { CwSelectOption } from './select/select-option.model';

export { StatusBadge } from './status-badge/status-badge';
export type { CwSize, CwStatus } from './status-badge/status-badge';
