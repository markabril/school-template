import { z } from 'zod'

/**
 * Password policy: length over composition rules.
 *
 * NIST dropped the mixed-character requirements years ago — they push people
 * toward `Password1!` and away from long passphrases. 12 characters minimum,
 * no composition rules, and the upper bound only exists because argon2 hashing
 * a megabyte of input is a free denial-of-service.
 */
export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters — a short phrase works well')
  .max(200)

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
})

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
})

export type LoginInput = z.infer<typeof loginSchema>
