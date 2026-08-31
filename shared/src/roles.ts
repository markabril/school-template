import { z } from 'zod'

/**
 * The full role set for the whole system, shipped in Release 1 even though
 * only `super_admin` and `content_editor` are assignable today.
 *
 * Release 2 (parent/student portal) adds no migration this way — see
 * docs/release-1.md §10. Do NOT trim this list to what Release 1 uses.
 */
export const ROLES = [
  'super_admin',
  'content_editor',
  'registrar',
  'teacher',
  'parent',
  'student',
] as const

export const roleSchema = z.enum(ROLES)
export type Role = z.infer<typeof roleSchema>

/** Roles the admin UI may currently assign. Widens in Release 2. */
export const ASSIGNABLE_ROLES: readonly Role[] = ['super_admin', 'content_editor']

/** Roles that are school staff. Deliberately explicit: Release 2's population
 *  is mostly parents, and code that assumes `user ⇒ staff` is the thing we are
 *  guarding against. Never infer staffness from "is logged in". */
export const STAFF_ROLES: readonly Role[] = [
  'super_admin',
  'content_editor',
  'registrar',
  'teacher',
]

export function isStaff(role: Role): boolean {
  return STAFF_ROLES.includes(role)
}

export const USER_STATUSES = ['active', 'invited', 'disabled'] as const
export const userStatusSchema = z.enum(USER_STATUSES)
export type UserStatus = z.infer<typeof userStatusSchema>
