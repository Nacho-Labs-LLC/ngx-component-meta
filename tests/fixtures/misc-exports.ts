/** A helper class for formatting. */
export class Formatter {
  /** Format a date. */
  format(value: Date, pattern: string = 'yyyy-MM-dd'): string {
    return value.toISOString();
  }

  /** The default pattern. */
  readonly defaultPattern: string = 'yyyy-MM-dd';
}

/** Calculate the sum of numbers. */
export function sum(...numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0);
}

/** The maximum page size. */
export const MAX_PAGE_SIZE = 100;

/** Default table configuration. */
export const DEFAULT_CONFIG: { pageSize: number; sortable: boolean } = {
  pageSize: 25,
  sortable: true,
};

/** @internal */
export class InternalHelper {}

/** @internal */
export function internalFn(): void {}
