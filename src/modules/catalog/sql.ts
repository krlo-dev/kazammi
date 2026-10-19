/**
 * Rows of a raw `db.execute()` result. postgres.js returns the rows array itself and
 * PGlite returns `{ rows }`; repositories must work with both.
 */
export function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  return (result as { rows: T[] }).rows;
}

/**
 * Postgres array literal ('{1,2,3}') for integer typed arrays. Sent as a single
 * parameter and cast in SQL (`::bigint[]`), so 45,000 values cost one bind, not 45,000.
 */
export function toPgArray(values: ArrayLike<number>): string {
  return `{${Array.prototype.join.call(values, ",")}}`;
}
