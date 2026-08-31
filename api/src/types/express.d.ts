import type { Role } from '@cms/shared'

export interface AuthUser {
  id: string
  email: string
  role: Role
  displayName: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by middleware/session.ts. Absent means unauthenticated. */
      auth?: { user: AuthUser; sessionId: string }
    }
  }
}

export {}
