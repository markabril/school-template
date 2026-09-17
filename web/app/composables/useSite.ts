import type { SiteSettings } from '@cms/shared'

export interface NavLink {
  id: string
  label: string
  href: string
  opensNewTab: boolean
}

export interface NavItem {
  id: string
  label: string
  /** Null when the item opens a dropdown rather than navigating. */
  href: string | null
  opensNewTab: boolean
  children: NavLink[]
}

export interface Chrome {
  settings: SiteSettings
  nav: { header: NavItem[]; footer: NavItem[] }
  announcements: Array<{ id: string; title: string; body: unknown }>
}

/**
 * Header, footer and announcements in one request.
 *
 * Fetched once per render with a shared key, so every layout and page reuses
 * the same payload rather than each component asking independently — three
 * round trips per page on a school's connection is very noticeable.
 */
export function useChrome() {
  return useApi<Chrome>('/content/chrome', { key: 'chrome' })
}
