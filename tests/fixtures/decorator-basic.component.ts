import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

/**
 * A basic button component using decorator-based inputs.
 * @since 1.0.0
 */
@Component({
  selector: 'app-button',
  standalone: true,
  template: '<button>{{label}}</button>',
})
export class ButtonComponent implements OnInit {
  /** The button label text. */
  @Input() label: string = 'Click me';

  /** Whether the button is disabled. */
  @Input({ required: true }) disabled!: boolean;

  /** Visual variant of the button. */
  @Input('btnVariant') variant: 'primary' | 'secondary' | 'danger' = 'primary';

  /** Emits when the button is clicked. */
  @Output() clicked = new EventEmitter<MouseEvent>();

  /** Emits when the button is focused. */
  @Output('btnFocus') focused = new EventEmitter<FocusEvent>();

  /** Internal counter — should appear as property. */
  clickCount = 0;

  private _internalState = false;

  ngOnInit(): void {
    // lifecycle hook — should not appear in methods
  }

  /** Reset the click counter. */
  reset(): void {
    this.clickCount = 0;
  }

  /** @internal */
  _handleClick(event: MouseEvent): void {
    // internal method — should not appear
  }
}
