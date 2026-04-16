import { Component, Input, Output, EventEmitter, input, output, model } from '@angular/core';

/**
 * Component mixing both decorator and signal APIs.
 */
@Component({
  selector: 'app-mixed',
  standalone: true,
  template: '',
})
export class MixedComponent {
  /** Decorator input. */
  @Input() name: string = '';

  /** Signal input. */
  age = input(0);

  /** Decorator output. */
  @Output() saved = new EventEmitter<void>();

  /** Signal output. */
  deleted = output<string>();

  /** Model signal. */
  selected = model(false);

  /** Plain property. */
  loading = false;

  /** A public method. */
  submit(): boolean {
    return true;
  }

  protected internalMethod(): void {}
}
