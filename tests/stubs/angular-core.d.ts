// Minimal @angular/core type stubs for testing ngx-component-meta.
// These provide just enough type information for the TS compiler to resolve
// Angular decorators and signal functions without needing the real package.

// --- Decorators ---

export declare function Component(meta: {
  selector?: string;
  standalone?: boolean;
  template?: string;
  templateUrl?: string;
  styleUrls?: string[];
  styles?: string[];
  exportAs?: string;
  changeDetection?: number;
  encapsulation?: number;
  imports?: any[];
  providers?: any[];
}): ClassDecorator;

export declare function Directive(meta: {
  selector?: string;
  standalone?: boolean;
  exportAs?: string;
  inputs?: string[];
  outputs?: string[];
  providers?: any[];
  hostDirectives?: any[];
}): ClassDecorator;

export declare function Pipe(meta: {
  name: string;
  standalone?: boolean;
  pure?: boolean;
}): ClassDecorator;

export declare function Injectable(meta?: {
  providedIn?: 'root' | 'platform' | 'any' | null;
}): ClassDecorator;

export declare function Input(opts?: string | {
  required?: boolean;
  alias?: string;
  transform?: (value: any) => any;
}): PropertyDecorator;

export declare function Output(opts?: string | {
  alias?: string;
}): PropertyDecorator;

export declare function ViewChild(selector: any, opts?: {
  read?: any;
  static?: boolean;
}): PropertyDecorator;

export declare function ViewChildren(selector: any, opts?: {
  read?: any;
}): PropertyDecorator;

export declare function ContentChild(selector: any, opts?: {
  read?: any;
  static?: boolean;
  descendants?: boolean;
}): PropertyDecorator;

export declare function ContentChildren(selector: any, opts?: {
  read?: any;
  descendants?: boolean;
}): PropertyDecorator;

export declare function HostBinding(hostPropertyName?: string): PropertyDecorator;
export declare function HostListener(eventName: string, args?: string[]): MethodDecorator;

// --- Event Emitter ---

export declare class EventEmitter<T = void> {
  emit(value?: T): void;
  subscribe(next?: (value: T) => void): { unsubscribe(): void };
}

// --- Signal types ---

export interface InputSignal<T> {
  (): T;
}

export interface InputSignalWithTransform<T, TransformType> {
  (): T;
}

export interface OutputEmitterRef<T = void> {
  emit(value: T): void;
}

export interface ModelSignal<T> {
  (): T;
  set(value: T): void;
  update(fn: (value: T) => T): void;
}

export interface Signal<T> {
  (): T;
}

// --- Signal functions ---

export declare function input<T>(): InputSignal<T | undefined>;
export declare function input<T>(initialValue: T, opts?: {
  alias?: string;
  transform?: (value: any) => T;
}): InputSignal<T>;
export declare namespace input {
  function required<T>(opts?: {
    alias?: string;
    transform?: (value: any) => T;
  }): InputSignal<T>;
}

export declare function output<T = void>(opts?: {
  alias?: string;
}): OutputEmitterRef<T>;

export declare function model<T>(): ModelSignal<T | undefined>;
export declare function model<T>(initialValue: T, opts?: {
  alias?: string;
}): ModelSignal<T>;
export declare namespace model {
  function required<T>(opts?: {
    alias?: string;
  }): ModelSignal<T>;
}

export declare function viewChild<T>(locator: string | any, opts?: {
  read?: any;
}): Signal<T | undefined>;
export declare namespace viewChild {
  function required<T>(locator: string | any, opts?: {
    read?: any;
  }): Signal<T>;
}

export declare function viewChildren<T>(locator: string | any, opts?: {
  read?: any;
}): Signal<readonly T[]>;

export declare function contentChild<T>(locator: string | any, opts?: {
  read?: any;
  descendants?: boolean;
}): Signal<T | undefined>;
export declare namespace contentChild {
  function required<T>(locator: string | any, opts?: {
    read?: any;
    descendants?: boolean;
  }): Signal<T>;
}

export declare function contentChildren<T>(locator: string | any, opts?: {
  read?: any;
  descendants?: boolean;
}): Signal<readonly T[]>;

// --- Built-in transforms ---

export declare function booleanAttribute(value: unknown): boolean;
export declare function numberAttribute(value: unknown): number;
export declare function numberAttribute(value: unknown, fallback: number): number;

// --- Lifecycle interfaces ---

export interface OnInit { ngOnInit(): void; }
export interface OnDestroy { ngOnDestroy(): void; }
export interface OnChanges { ngOnChanges(changes: SimpleChanges): void; }
export interface AfterViewInit { ngAfterViewInit(): void; }
export interface AfterContentInit { ngAfterContentInit(): void; }
export interface DoCheck { ngDoCheck(): void; }
export interface AfterViewChecked { ngAfterViewChecked(): void; }
export interface AfterContentChecked { ngAfterContentChecked(): void; }

export interface SimpleChanges {
  [propName: string]: SimpleChange;
}

export interface SimpleChange {
  previousValue: any;
  currentValue: any;
  firstChange: boolean;
  isFirstChange(): boolean;
}

// --- Common types ---

export declare class ElementRef<T = any> {
  nativeElement: T;
}

export declare class TemplateRef<C = any> {
  elementRef: ElementRef;
}

export declare class QueryList<T> implements Iterable<T> {
  [Symbol.iterator](): Iterator<T>;
  readonly length: number;
  readonly first: T;
  readonly last: T;
  toArray(): T[];
}

export declare class ChangeDetectorRef {
  markForCheck(): void;
  detectChanges(): void;
}

export interface PipeTransform {
  transform(value: any, ...args: any[]): any;
}
