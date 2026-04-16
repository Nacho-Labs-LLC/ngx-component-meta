import { Component, input, output, model } from '@angular/core';

/**
 * A card component using signal-based inputs.
 */
@Component({
  selector: 'app-card',
  standalone: true,
  template: '<div>{{title()}}</div>',
})
export class CardComponent {
  /** The card title. */
  title = input.required<string>();

  /** Card size variant. */
  size = input<'sm' | 'md' | 'lg'>('md', { alias: 'cardSize' });

  /** Whether the card is elevated. */
  elevated = input(false);

  /** Emits when the card is selected. */
  selected = output<string>();

  /** Emits when the card is dismissed. */
  dismissed = output<void>({ alias: 'cardDismissed' });

  /** Whether the card is expanded (two-way binding). */
  expanded = model(false);

  /** The active tab (two-way, required). */
  activeTab = model.required<string>();

  /** Refresh the card data. */
  refresh(): void {
    // implementation
  }
}
