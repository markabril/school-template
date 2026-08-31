import { hash, verify, Algorithm } from '@node-rs/argon2'

/**
 * argon2id at OWASP's recommended floor (19 MiB, 2 iterations, 1 lane).
 *
 * `@node-rs/argon2` ships prebuilt binaries, so there is no node-gyp toolchain
 * requirement on Windows — which matters because this has to build on the
 * school's machine, not just a developer's.
 */
const OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS)
}

export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  try {
    return await verify(storedHash, password)
  } catch {
    // A malformed hash in the database must read as "wrong password", never as
    // a 500 that tells an attacker this account is special.
    return false
  }
}

/**
 * Burn roughly the same time as a real verify when the account does not exist.
 * Without this, "no such user" returns in ~1ms and "wrong password" in ~50ms,
 * which is a usable account-enumeration oracle regardless of how carefully the
 * response messages are worded.
 */
export async function fakeVerify(): Promise<void> {
  await hashPassword('timing-equalisation-only')
}
