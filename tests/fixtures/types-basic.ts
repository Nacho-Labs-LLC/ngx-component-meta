/** Button size options. */
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Status codes. */
export enum Status {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Pending = 'PENDING',
}

/** User configuration. */
export interface UserConfig {
  name: string;
  age?: number;
  /** User role. */
  role: string;
}

/** Shape with area calculation. */
export interface Shape {
  /** Shape name. */
  name: string;
  /** Calculate the area. */
  area(precision?: number): number;
}

/** A named shape extends Shape. */
export interface NamedShape extends Shape {
  /** Display label. */
  label: string;
}

/** @internal */
export interface InternalConfig {
  debug: boolean;
}

interface PrivateHelper {
  secret: string;
}
