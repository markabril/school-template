import { z } from 'zod'

/**
 * Site settings, declared once so the admin form, the API and the public site
 * agree on what exists.
 *
 * A free-form key/value store with no schema becomes a junk drawer nobody dares
 * delete from. Declaring the keys means the settings screen can be generated
 * from this list and an unknown key is a typo rather than a new feature.
 */
export const settingsSchema = z.object({
  'site.name': z.string().min(1).max(120),
  'site.tagline': z.string().max(160),
  'site.description': z.string().max(300),
  'site.foundedYear': z.coerce.number().int().min(1800).max(2100),
  'contact.email': z.union([z.string().email(), z.literal('')]),
  'contact.phone': z.string().max(60),
  'contact.address': z.string().max(300),
  'contact.mapEmbedUrl': z.string().max(500),
  'social.facebook': z.string().max(300),
})

export type SiteSettings = z.infer<typeof settingsSchema>
export type SettingKey = keyof SiteSettings

export interface SettingField {
  key: SettingKey
  label: string
  hint?: string
  group: 'Site' | 'Contact' | 'Social'
  multiline?: boolean
}

/** Drives the admin settings form. Order here is the order on screen. */
export const SETTING_FIELDS: SettingField[] = [
  { key: 'site.name', label: 'School name', group: 'Site' },
  { key: 'site.tagline', label: 'Tagline', hint: 'Shown under the name. For example the school motto.', group: 'Site' },
  {
    key: 'site.description',
    label: 'Description',
    hint: 'Used by search engines and when the site is shared on social media.',
    group: 'Site',
    multiline: true,
  },
  { key: 'site.foundedYear', label: 'Year founded', group: 'Site' },
  { key: 'contact.email', label: 'Email address', group: 'Contact' },
  { key: 'contact.phone', label: 'Telephone', group: 'Contact' },
  { key: 'contact.address', label: 'Address', group: 'Contact', multiline: true },
  {
    key: 'contact.mapEmbedUrl',
    label: 'Map embed address',
    hint: 'The src from a Google Maps embed. Leave empty for no map.',
    group: 'Contact',
  },
  { key: 'social.facebook', label: 'Facebook page', group: 'Social' },
]

export const DEFAULT_SETTINGS: SiteSettings = {
  'site.name': 'Cherished Moments School',
  'site.tagline': 'I Think. I Lead. I Care.',
  'site.description': '',
  'site.foundedYear': 1990,
  'contact.email': '',
  'contact.phone': '',
  'contact.address': '',
  'contact.mapEmbedUrl': '',
  'social.facebook': '',
}
