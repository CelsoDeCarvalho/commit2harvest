/**
 * Utility functions for dynamic timesheet hour parsing and formatting.
 * Supports natural human formats like '45m', '15m', '1h26m', '1h 30m', '45 minutos', '2h', '1.5', etc.
 */

/**
 * Parses user input into decimal hours (float rounded to 2 decimal places).
 * Examples:
 * - '45m', '45 min', '45 minutos' -> 0.75
 * - '15m', '15min' -> 0.25
 * - '1h26m', '1h 26m', '1:26' -> 1.43
 * - '2h', '2 hours', '2' -> 2.0
 * - '1.5', '1,5' -> 1.5
 */
export function parseDynamicHours(input: string | number): number {
  if (typeof input === 'number') {
    return isNaN(input) || input < 0 ? 0 : +input.toFixed(2);
  }
  if (!input || typeof input !== 'string' || !input.trim()) {
    return 0;
  }

  const str = input.trim().toLowerCase();

  // 1. Matches like '1h26m', '1h 26m', '1h26min', '2h 15mins', '1h 30'
  const hmMatch = str.match(/^(\d+)\s*h(?:our(?:s)?|oras?)?\s*(\d+)\s*(?:m|min|minutos?|mins?)?$/);
  if (hmMatch) {
    const h = parseInt(hmMatch[1], 10);
    const m = parseInt(hmMatch[2], 10);
    return +((h + m / 60).toFixed(2));
  }

  // 2. Matches '1:26', '0:45', '2:15'
  const colonMatch = str.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    return +((h + m / 60).toFixed(2));
  }

  // 3. Matches '45m', '15m', '45min', '45 minutos', '90m'
  const mMatch = str.match(/^(\d+)\s*(?:m|min|minutos?|mins?)$/);
  if (mMatch) {
    const m = parseInt(mMatch[1], 10);
    return +((m / 60).toFixed(2));
  }

  // 4. Matches '2h', '1.5h', '2.5 horas'
  const hMatch = str.match(/^(\d+(?:[.,]\d+)?)\s*(?:h|hours?|horas?)?$/);
  if (hMatch) {
    const val = parseFloat(hMatch[1].replace(',', '.'));
    return isNaN(val) || val < 0 ? 0 : +val.toFixed(2);
  }

  const num = parseFloat(str.replace(',', '.'));
  return isNaN(num) || num < 0 ? 0 : +num.toFixed(2);
}

/**
 * Formats a decimal hour amount into human natural format (e.g. '1h 26m', '45m', '2h')
 * or clean decimal format ('1.43h').
 */
export function formatDynamicHours(
  hours: number,
  format: 'natural' | 'decimal' = 'natural'
): string {
  if (typeof hours !== 'number' || isNaN(hours) || hours <= 0) {
    return format === 'decimal' ? '0.00h' : '0m';
  }

  if (format === 'decimal') {
    return `${hours.toFixed(2)}h`;
  }

  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  if (h > 0 && m > 0) {
    return `${h}h ${m}m`;
  }
  if (h > 0 && m === 0) {
    return `${h}h`;
  }
  return `${m}m`;
}
