import { Directive, HostBinding, HostListener, Input } from '@angular/core';

/** Directive that highlights elements on hover. */
@Directive({ selector: '[appHighlight]', standalone: true })
export class HighlightDirective {
  /** The highlight color. */
  @Input() color: string = 'yellow';

  /** Whether the element is currently highlighted. */
  @HostBinding('class.highlighted') isHighlighted = false;

  /** The background color style. */
  @HostBinding('style.backgroundColor') get backgroundColor(): string {
    return this.isHighlighted ? this.color : '';
  }

  /** Attribute role for accessibility. */
  @HostBinding('attr.role') role = 'button';

  /** Handle mouse enter. */
  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.isHighlighted = true;
  }

  /** Handle mouse leave. */
  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.isHighlighted = false;
  }

  /** Handle click with event arg. */
  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {}
}
