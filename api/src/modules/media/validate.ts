import { badRequest } from '../../lib/errors.js'

export interface DetectedType {
  mime: string
  ext: string
  kind: 'image' | 'document'
}

/**
 * Identify a file by its magic bytes.
 *
 * The browser-supplied Content-Type is attacker-controlled and, more mundanely,
 * frequently just wrong coming off Windows. Sniffing the actual bytes is the
 * only check worth having — an attacker renaming `payload.html` to `photo.jpg`
 * gets rejected here rather than at whatever later stage happens to notice.
 */
const SIGNATURES: Array<{ test: (b: Buffer) => boolean } & DetectedType> = [
  {
    mime: 'image/jpeg',
    ext: 'jpg',
    kind: 'image',
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: 'image/png',
    ext: 'png',
    kind: 'image',
    test: (b) =>
      b
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: 'image/webp',
    ext: 'webp',
    kind: 'image',
    test: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  {
    mime: 'image/gif',
    ext: 'gif',
    kind: 'image',
    test: (b) => {
      const s = b.subarray(0, 6).toString('ascii')
      return s === 'GIF87a' || s === 'GIF89a'
    },
  },
  {
    mime: 'application/pdf',
    ext: 'pdf',
    kind: 'document',
    test: (b) => b.subarray(0, 5).toString('ascii') === '%PDF-',
  },
]

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_DOC_BYTES = 25 * 1024 * 1024

export function detectType(buffer: Buffer): DetectedType {
  if (buffer.length < 12) throw badRequest('That file is empty or truncated')

  const match = SIGNATURES.find((s) => s.test(buffer))
  if (!match) {
    /**
     * SVG is deliberately absent and this is a change from the original plan
     * (docs/release-1.md §5), which proposed allowing it for super_admin behind
     * a sanitiser.
     *
     * SVG is XML: it can carry <script>, event handlers, <foreignObject> and
     * external references, and it is served inline — so a bad one is stored
     * XSS on a site staff sign in to. Hand-written SVG sanitisers leak, and a
     * correct one means adding DOMPurify plus jsdom to strip attacker-supplied
     * markup we do not actually need.
     *
     * The only SVG this site needs is the school crest, which is a build asset
     * committed by a developer, not something the office uploads. Rejecting the
     * format outright removes the whole class of problem for no real loss.
     */
    throw badRequest(
      'That file type is not supported. Use JPEG, PNG, WebP, GIF or PDF. ' +
        'SVG files cannot be uploaded — send them to a developer to add directly.',
    )
  }

  return match
}

export function assertSize(bytes: number, kind: DetectedType['kind']): void {
  const max = kind === 'image' ? MAX_IMAGE_BYTES : MAX_DOC_BYTES
  if (bytes > max) {
    throw badRequest(`That file is too large. The limit is ${Math.round(max / 1024 / 1024)}MB.`)
  }
}
