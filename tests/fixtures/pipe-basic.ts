import { Pipe, PipeTransform } from '@angular/core';

/**
 * Truncates a string to a maximum length.
 * @since 2.0.0
 */
@Pipe({
  name: 'truncate',
  standalone: true,
  pure: true,
})
export class TruncatePipe implements PipeTransform {
  /**
   * Transform the value.
   * @param value - The string to truncate
   * @param maxLength - Maximum allowed length
   * @param suffix - Suffix to append when truncated
   */
  transform(value: string, maxLength: number = 100, suffix: string = '...'): string {
    if (value.length <= maxLength) return value;
    return value.slice(0, maxLength) + suffix;
  }
}
