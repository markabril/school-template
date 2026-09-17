import type { RichTextDoc } from '@cms/shared'
import type { MediaItem } from '~/composables/useMedia'

export interface PostSummary {
  id: string
  slug: string
  title: string
  excerpt: string
  category: string | null
  publishedAt: string
  cover: MediaItem | null
}

export interface EventItem {
  id: string
  slug: string
  title: string
  startsAt: string
  endsAt: string | null
  allDay: boolean
  location: string | null
  description: RichTextDoc | null
  cover: MediaItem | null
}

export interface StoriesColumn {
  title: string
  category: string
  posts: PostSummary[]
}
