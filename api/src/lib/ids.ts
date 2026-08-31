import { ulid } from 'ulid'

/**
 * All primary keys are ULIDs: lexicographically sortable by creation time,
 * safe to expose in URLs, and they leak no row counts the way integers do.
 *
 * Sortability matters more than it looks — `ORDER BY id` is a free
 * created-at ordering, and SQLite indexes it well.
 */
export function newId(): string {
  return ulid()
}

const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/

export function isId(value: unknown): value is string {
  return typeof value === 'string' && ULID_RE.test(value)
}
