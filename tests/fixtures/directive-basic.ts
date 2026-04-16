import { Directive, Input } from '@angular/core';

/**
 * Adds a tooltip to the host element.
 */
@Directive({
  selector: '[appTooltip]',
  standalone: true,
  exportAs: 'tooltip',
})
export class TooltipDirective {
  /** The tooltip text. */
  @Input({ required: true, alias: 'appTooltip' }) text!: string;

  /** Tooltip placement. */
  @Input() placement: 'top' | 'bottom' | 'left' | 'right' = 'top';

  /** Show the tooltip. */
  show(): void {}

  /** Hide the tooltip. */
  hide(): void {}
}
