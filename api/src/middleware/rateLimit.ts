import type { RequestHandler } from 'express'
import { tooManyRequests } from '../lib/errors.js'

type Bucket = { count: number; resetAt: number }

/**
 * Small in-memory fixed-window limiter.
 *
 * In-memory is a deliberate fit for this deployment, not a shortcut: one
 * Express process on one VPS, so there is no shared state to coordinate. If
 * this ever runs multi-process, this must move to SQLite or Redis — a
 * per-process limiter silently multiplies the real limit by the worker count.
 *
 * Counters reset on restart. Acceptable: an attacker cannot trigger a restart,
 * and a deploy resetting login counters is not a meaningful window.
 */
const buckets = new Map<string, Bucket>()

// Bounded sweep so a flood of unique keys cannot grow the map without limit.
setInterval(() => {
  const now = Date.now()
  for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key)
}, 60_000).unref()

export function consume(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (existing.count >= limit) return false

  existing.count += 1
  return true
}

export function resetKey(key: string): void {
  buckets.delete(key)
}

/** Generic per-IP limiter for a route. */
export function rateLimit(opts: { limit: number; windowMs: number; name: string }): RequestHandler {
  return (req, _res, next) => {
    const key = `${opts.name}:${req.ip ?? 'unknown'}`
    if (!consume(key, opts.limit, opts.windowMs)) {
      return next(tooManyRequests('Too many attempts. Please wait and try again.'))
    }
    next()
  }
}

/**
 * Login needs two dimensions, and only having one is a real gap:
 *  - per IP stops one host spraying many accounts
 *  - per account stops a distributed attempt against one known address
 * Neither alone is sufficient.
 */
export const LOGIN_IP = { limit: 20, windowMs: 15 * 60 * 1000 }
export const LOGIN_ACCOUNT = { limit: 5, windowMs: 15 * 60 * 1000 }
