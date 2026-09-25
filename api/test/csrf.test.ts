import type { Request, Response } from 'express'
import { describe, expect, it } from 'vitest'
import { csrfGuard } from '../src/middleware/csrf.js'
import { env } from '../src/env.js'

/** Minimal stand-in for the parts of a request the guard reads. */
function request(method: string, headers: Record<string, string>): Request {
  return {
    method,
    get: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request
}

/** Runs the guard and returns the error it passed to next(), or null. */
function run(req: Request): { status?: number; message?: string } | null {
  let result: unknown = null
  csrfGuard(req, {} as Response, (err?: unknown) => {
    result = err ?? null
  })
  return result as { status?: number; message?: string } | null
}

describe('csrfGuard', () => {
  it('allows the configured origin', () => {
    expect(run(request('POST', { origin: env.PUBLIC_ORIGIN }))).toBeNull()
  })

  it('refuses a genuinely different origin', () => {
    const err = run(request('POST', { origin: 'https://evil.example' }))
    expect(err?.status).toBe(403)
  })

  // The dev server answers on both spellings of the loopback address, and a
  // person who types the one the config does not name cannot sign in at all.
  it('accepts the other loopback spelling on the same port in development', () => {
    const port = new URL(env.PUBLIC_ORIGIN).port
    expect(run(request('POST', { origin: `http://127.0.0.1:${port}` }))).toBeNull()
    expect(run(request('POST', { origin: `http://localhost:${port}` }))).toBeNull()
  })

  it('still refuses loopback on a different port', () => {
    const err = run(request('POST', { origin: 'http://localhost:9999' }))
    expect(err?.status).toBe(403)
  })
})
