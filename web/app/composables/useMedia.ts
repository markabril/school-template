export interface MediaItem {
  id: string
  filename: string
  mime: string
  size: number
  width: number | null
  height: number | null
  alt: string
  caption: string | null
  url: string
  srcset: Array<{ width: number; url: string }>
  createdAt: string
}

export function useMedia() {
  const items = useState<MediaItem[]>('media:items', () => [])
  const loaded = useState('media:loaded', () => false)

  async function load(force = false) {
    if (loaded.value && !force) return items.value
    const res = await $fetch<{ media: MediaItem[] }>('/api/media', { credentials: 'include' })
    items.value = res.media
    loaded.value = true
    return items.value
  }

  async function upload(file: File, alt: string, caption?: string) {
    // FormData, not JSON — and deliberately no Content-Type header: the browser
    // must set it so it can include the multipart boundary.
    const form = new FormData()
    form.append('file', file)
    form.append('alt', alt)
    if (caption) form.append('caption', caption)

    const res = await $fetch<{ media: MediaItem }>('/api/media', {
      method: 'POST',
      body: form,
      credentials: 'include',
    })
    items.value = [res.media, ...items.value]
    return res.media
  }

  async function remove(id: string) {
    await $fetch(`/api/media/${id}`, { method: 'DELETE', credentials: 'include' })
    items.value = items.value.filter((m) => m.id !== id)
  }

  async function updateMeta(id: string, patch: { alt?: string; caption?: string | null }) {
    const res = await $fetch<{ media: MediaItem }>(`/api/media/${id}`, {
      method: 'PATCH',
      body: patch,
      credentials: 'include',
    })
    items.value = items.value.map((m) => (m.id === id ? res.media : m))
    return res.media
  }

  return { items, load, upload, remove, updateMeta }
}

/** `srcset` string for an uploaded image, or undefined when there are no derivatives. */
export function srcsetFor(item: MediaItem): string | undefined {
  if (!item.srcset.length) return undefined
  return item.srcset.map((s) => `${s.url} ${s.width}w`).join(', ')
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
