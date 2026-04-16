import { Component, Input, input } from '@angular/core';

@Component({
  selector: 'app-base',
  standalone: true,
  template: '',
})
export class BaseComponent {
  /** Unique identifier from base. */
  @Input() id!: string;

  /** Whether the component is visible. */
  visible = input(true);

  /** Base reset method. */
  reset(): void {}
}

/**
 * Extended component that inherits from base.
 */
@Component({
  selector: 'app-child',
  standalone: true,
  template: '<div>{{label()}}</div>',
})
export class ChildComponent extends BaseComponent {
  /** The child label. */
  label = input.required<string>();

  /** Override: id has a different default in child. */
  @Input() override id: string = 'child-default';
}
