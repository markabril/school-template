# Public Site Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-lay out the Cherished Moments School public website on the University of the Philippines page structure, in the school's own brand, and fill it with removable stock-photo demo content.

**Architecture:** The homepage stays block-driven. Two reference blocks gain a `layout` option, and one new reference block (`storiesColumns`) is resolved server-side like the others. The layout shell becomes a two-tier maroon header with one level of accessible dropdowns and a column-driven maroon footer, fed by a nested navigation tree from the API. A `seed:demo` script creates all demo content through the existing services and records a manifest so removal is exact.

**Tech Stack:** Nuxt 4, Vue 3.5, Tailwind CSS v4, Express 5, Drizzle ORM + better-sqlite3, Zod 4, Vitest 5 (added by this plan), sharp.

**Spec:** `docs/superpowers/specs/2026-09-17-public-site-redesign-design.md`

## Global Constraints

- Project root: `E:\Development\Web_Development\School Website`. Quote the path in shells — it contains a space.
- Dev ports: web `http://127.0.0.1:3100`, api `http://127.0.0.1:4100`.
- Borrow layout patterns only from https://up.edu.ph/ — never UP's seal, wordmark or imagery.
- Raw `--color-gold` (`#B4882B`) never carries text. Text on maroon uses cream (10.6:1) or `gold-light` (6.1:1). The hero primary button is `gold-light` background with `maroon-deep` text (7.9:1).
- No `v-html` anywhere.
- Dynamic components are registered as imported component objects, never name strings.
- Every date shown on the public site is formatted in the `Asia/Manila` time zone (prevents SSR/client hydration mismatches).
- Stored blocks without `layout` must render exactly as before: `newsTeaser` defaults to `grid`, `eventsTeaser` to `list`.
- Demo photos are never committed. `api/data/demo-images/` is gitignored.
- Demo photo caption, exactly: `PLACEHOLDER — replace before launch`
- Commit messages end with a blank line then `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Work happens on branch `feat/public-site-redesign`, never on `main`.

## File Map

**Shared (`shared/src/`)**
- `blocks/references.ts` — modify: `layout` on `newsTeaser`/`eventsTeaser`; new `storiesColumnsSchema`; `storiesColumns` in `REFERENCE_BLOCK_TYPES`
- `blocks/index.ts` — modify: registry entry and defaults
- `blocks/blocks.test.ts` — create

**API (`api/`)**
- `vitest.config.ts`, `test/setup.ts`, `test/helpers.ts` — create: test harness
- `src/env.ts` — modify: `silent` log level, `MEDIA_DIR`
- `src/db/client.ts` — modify: `:memory:` support
- `src/modules/media/media.service.ts` — modify: `MEDIA_ROOT` from `MEDIA_DIR`
- `src/modules/site/site.service.ts` — modify: settings allowlist, navigation tree in/out, public nav shape, staff/download purge
- `src/modules/site/site.routes.ts` — modify: navigation schema, `tree` in GET
- `src/lib/purge.ts` — create: `pathsForBlockTypes`
- `src/modules/posts/posts.service.ts` — modify: purge wiring, `related`
- `src/modules/events/events.service.ts`, `events.routes.ts` — modify: `cover`, `coverMediaId`, purge wiring
- `src/modules/pages/references.ts` — modify: `storiesColumns` resolution
- `src/demo/content.ts`, `src/demo/pdf.ts`, `src/demo/seed.ts` — create
- `src/scripts/seed-demo.ts` — create: CLI
- `test/*.test.ts` — create, one per task

**Web (`web/app/`)**
- `types/content.ts` — create: `PostSummary`, `EventItem`, `StoriesColumn`
- `utils/dates.ts` — create: Manila-time formatters
- `assets/css/main.css` — modify: `.btn-*`, `.chip` classes
- `composables/useSite.ts` — modify: `NavLink`, `NavItem`
- `layouts/default.vue` — rewrite
- `components/site/SiteNav.vue`, `SiteMobileNav.vue`, `SiteFooter.vue` — create
- `components/SectionHeading.vue`, `DateBadge.vue`, `NewsCard.vue`, `Breadcrumbs.vue` — create
- `components/PageHeader.vue` — rewrite
- `components/blocks/BlockHero.vue`, `BlockNewsTeaser.vue`, `BlockEventsTeaser.vue` — rewrite
- `components/blocks/BlockStoriesColumns.vue` — create
- `components/BlockRenderer.vue` — modify
- `pages/[...slug].vue`, `news/index.vue`, `news/[slug].vue`, `events/index.vue`, `staff.vue`, `downloads.vue`, `contact.vue`, `error.vue` — modify
- `components/admin/blocks/ReferenceEditor.vue`, `NewsTeaserEditor.vue`, `EventsTeaserEditor.vue` — modify
- `components/admin/blocks/StoriesColumnsEditor.vue` — create
- `components/admin/BlockEditor.vue` — modify
- `pages/admin/events.vue`, `pages/admin/navigation.vue` — modify / rewrite

**Scripts and docs**
- `scripts/render-check.mjs` — create
- `scripts/a11y-audit.mjs` — modify
- `docs/demo-image-credits.md` — create
- `README.md` — modify

## Task Order and Why

1. Branch, test harness, settings allowlist (blocks the manifest leak)
2. Block schemas and block editors (type-coupled — must land together)
3. Navigation tree API
4. Purge helper
5. Event covers (API and admin)
6. Related articles
7. `storiesColumns` resolution
8. Demo photos — **stops for user approval**
9. `seed:demo`
10. Layout shell and render-check harness (web checks assert against demo content from Task 9)
11. Shared components and page header band
12. Homepage blocks
13. Inner pages
14. Navigation admin nesting
15. Final verification and docs

---

### Task 1: Branch, test harness, settings allowlist

**Files:**
- Modify: `.gitignore`
- Modify: `package.json`, `api/package.json`
- Create: `api/vitest.config.ts`, `api/test/setup.ts`, `api/test/helpers.ts`
- Modify: `api/tsconfig.json`
- Modify: `api/src/env.ts`
- Modify: `api/src/db/client.ts`
- Modify: `api/src/modules/media/media.service.ts`
- Modify: `api/src/modules/site/site.service.ts` (`getSettings`)
- Test: `api/test/settings.test.ts`

**Interfaces:**
- Produces: `npm test` at the root runs every workspace's `test` script.
- Produces: `truncateAll(): void`, `makeAdmin(): Promise<{ id: string }>`, `actorOf(user): { id: string; ip: string }` from `api/test/helpers.ts`.
- Produces: env `MEDIA_DIR` (default `./data/media`); `MEDIA_ROOT = path.resolve(env.MEDIA_DIR)`.
- Produces: `getSettings()` returns only keys declared in `DEFAULT_SETTINGS`.

- [ ] **Step 1: Create the branch and commit the approved spec and this plan**

```bash
cd "E:/Development/Web_Development/School Website"
git checkout -b feat/public-site-redesign
git add docs/superpowers/specs/2026-09-17-public-site-redesign-design.md docs/superpowers/plans/2026-09-17-public-site-redesign.md
git commit -m "docs: public site redesign spec and plan" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Install Vitest**

```bash
npm install -D vitest@^5.0.1 --workspace=api --workspace=shared
npm pkg set scripts.test="vitest run" --workspace=api
npm pkg set scripts.test="vitest run" --workspace=shared
npm pkg set scripts.test="npm run test --workspaces --if-present"
```

- [ ] **Step 3: Ignore test media and demo images**

Append to `.gitignore`:

```gitignore

# Test run media (created and removed by the API test suite)
api/test/.tmp-media/

# Stock photos for `npm run seed:demo` — licensed for use, never committed
api/data/demo-images/
```

- [ ] **Step 4: Let the database client and media root be configured for tests**

In `api/src/env.ts`, replace the `LOG_LEVEL` line and add `MEDIA_DIR` after `DATABASE_PATH`:

```ts
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
```

```ts
  DATABASE_PATH: z.string().default('./data/school.db'),
  // Where uploaded files live. Tests point this at a throwaway directory.
  MEDIA_DIR: z.string().default('./data/media'),
```

In `api/src/db/client.ts`, replace:

```ts
const dbPath = path.resolve(env.DATABASE_PATH)
mkdirSync(path.dirname(dbPath), { recursive: true })
```

with:

```ts
// `:memory:` is a SQLite sentinel, not a path — resolving it would produce a
// file literally named ":memory:", which is also invalid on Windows.
const isMemory = env.DATABASE_PATH === ':memory:'
const dbPath = isMemory ? ':memory:' : path.resolve(env.DATABASE_PATH)
if (!isMemory) mkdirSync(path.dirname(dbPath), { recursive: true })
```

In `api/src/modules/media/media.service.ts`, replace:

```ts
export const MEDIA_ROOT = path.resolve('data/media')
```

with:

```ts
export const MEDIA_ROOT = path.resolve(env.MEDIA_DIR)
```

and add `import { env } from '../../env.js'` to that file's imports.

- [ ] **Step 5: Create the Vitest config and setup**

`api/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // better-sqlite3 is a native module; forks isolate it cleanly per file.
    pool: 'forks',
    setupFiles: ['./test/setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_PATH: ':memory:',
      MEDIA_DIR: './test/.tmp-media',
      LOG_LEVEL: 'silent',
      PUBLIC_ORIGIN: 'http://localhost:3100',
      // Port 9 (discard) refuses connections immediately, so fire-and-forget
      // cache purges fail fast instead of hanging a test.
      REVALIDATE_URL: 'http://127.0.0.1:9/__revalidate',
      REVALIDATE_SECRET: 'test-revalidate-secret',
      SECRET_KEY: 'test-secret-key-value',
      MAIL_TRANSPORT: 'file',
    },
  },
})
```

`api/test/setup.ts`:

```ts
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from '../src/db/client.js'

// Each test file runs in its own fork with a fresh in-memory database.
migrate(db, { migrationsFolder: './drizzle' })
```

`api/test/helpers.ts`:

```ts
import { db, sqlite } from '../src/db/client.js'
import { users } from '../src/db/schema/index.js'

/** Empty every application table. Call in beforeEach. */
export function truncateAll(): void {
  const tables = sqlite
    .prepare(
      "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name != '__drizzle_migrations'",
    )
    .all() as Array<{ name: string }>

  sqlite.pragma('foreign_keys = OFF')
  for (const t of tables) sqlite.prepare(`delete from "${t.name}"`).run()
  sqlite.pragma('foreign_keys = ON')
}

export async function makeAdmin() {
  return db
    .insert(users)
    .values({
      email: 'admin@test.local',
      displayName: 'Test Admin',
      role: 'super_admin',
      status: 'active',
      passwordHash: null,
    })
    .returning()
    .then((r) => r[0]!)
}

export const actorOf = (user: { id: string }) => ({ id: user.id, ip: '127.0.0.1' })
```

In `api/tsconfig.json`, replace the `include` line with:

```json
  "include": ["src/**/*.ts", "test/**/*.ts", "drizzle.config.ts", "vitest.config.ts", "../shared/src/**/*.ts"],
```

- [ ] **Step 6: Write the failing test**

`api/test/settings.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/client.js'
import { siteSettings } from '../src/db/schema/index.js'
import { getSettings } from '../src/modules/site/site.service.js'
import { truncateAll } from './helpers.js'

describe('getSettings', () => {
  beforeEach(truncateAll)

  it('never exposes keys outside the declared settings', async () => {
    // Internal bookkeeping (e.g. the demo manifest) lives in the same table
    // and must not reach the public /content/chrome response.
    await db.insert(siteSettings).values({ key: 'demo.manifest', value: { ids: ['x'] } })
    await db.insert(siteSettings).values({ key: 'site.name', value: 'Stored Name' })

    const settings = await getSettings()

    expect(settings).not.toHaveProperty(['demo.manifest'])
    expect(settings['site.name']).toBe('Stored Name')
  })

  it('falls back to defaults for missing keys', async () => {
    const settings = await getSettings()
    expect(settings['site.tagline']).toBe('I Think. I Lead. I Care.')
  })
})
```

- [ ] **Step 7: Run it and verify the first test fails**

Run: `npm test --workspace=api`
Expected: `never exposes keys outside the declared settings` FAILS — `expected { … 'demo.manifest': … } not to have property "demo.manifest"`. The defaults test passes.

- [ ] **Step 8: Filter `getSettings` to declared keys**

In `api/src/modules/site/site.service.ts`, replace the body of `getSettings`:

```ts
export async function getSettings(): Promise<SiteSettings> {
  const rows = await db.select().from(siteSettings)
  // Only declared keys. The table also holds internal bookkeeping such as the
  // demo manifest, and this object is served publicly.
  const known = new Set(Object.keys(DEFAULT_SETTINGS))
  const stored = Object.fromEntries(rows.filter((r) => known.has(r.key)).map((r) => [r.key, r.value]))
  // Defaults fill any gap, so a missing row can never render the site blank.
  return { ...DEFAULT_SETTINGS, ...stored } as SiteSettings
}
```

- [ ] **Step 9: Run tests and typecheck**

Run: `npm test --workspace=api`
Expected: 2 passed.

Run: `npm run typecheck --workspace=api`
Expected: no `error TS` lines.

- [ ] **Step 10: Commit**

```bash
git add .gitignore package.json package-lock.json api/package.json shared/package.json api/vitest.config.ts api/test api/tsconfig.json api/src/env.ts api/src/db/client.ts api/src/modules/media/media.service.ts api/src/modules/site/site.service.ts
git commit -m "test: add vitest harness; stop leaking undeclared settings publicly" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Block schemas and block editors

**Files:**
- Modify: `shared/src/blocks/references.ts`
- Modify: `shared/src/blocks/index.ts`
- Test: `shared/src/blocks/blocks.test.ts`
- Modify: `web/app/components/admin/blocks/ReferenceEditor.vue`
- Modify: `web/app/components/admin/blocks/NewsTeaserEditor.vue`
- Modify: `web/app/components/admin/blocks/EventsTeaserEditor.vue`
- Create: `web/app/components/admin/blocks/StoriesColumnsEditor.vue`
- Modify: `web/app/components/admin/BlockEditor.vue`

**Interfaces:**
- Produces: `newsTeaserSchema` with `layout: 'featured' | 'grid'` (default `grid`; `featured` requires `limit >= 3`).
- Produces: `eventsTeaserSchema` with `layout: 'featured' | 'list'` (default `list`).
- Produces: `storiesColumnsSchema` — `{ heading?: string; columns: Array<{ title: string; category: string; limit: number }> }`, 1–3 columns, limit 1–5.
- Produces: `'storiesColumns'` in `BLOCK_TYPES` and `REFERENCE_BLOCK_TYPES`.

- [ ] **Step 1: Write the failing test**

`shared/src/blocks/blocks.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { blockRegistry, isReferenceBlock, parseBlockData } from './index.js'

describe('newsTeaser layout', () => {
  it('parses stored data without a layout as grid, so published pages do not change', () => {
    expect(parseBlockData('newsTeaser', { heading: 'News', limit: 3, category: null }).layout).toBe('grid')
  })

  it('defaults new blocks to featured', () => {
    expect(blockRegistry.newsTeaser.defaults().layout).toBe('featured')
  })

  it('requires at least three articles for the featured layout', () => {
    expect(() => parseBlockData('newsTeaser', { limit: 2, layout: 'featured' })).toThrow(/at least 3/)
    expect(parseBlockData('newsTeaser', { limit: 2, layout: 'grid' }).limit).toBe(2)
  })
})

describe('eventsTeaser layout', () => {
  it('parses stored data without a layout as list', () => {
    expect(parseBlockData('eventsTeaser', { limit: 3 }).layout).toBe('list')
  })

  it('defaults new blocks to featured', () => {
    expect(blockRegistry.eventsTeaser.defaults().layout).toBe('featured')
  })
})

describe('storiesColumns', () => {
  const column = (title: string) => ({ title, category: title, limit: 3 })

  it('is a reference block', () => {
    expect(isReferenceBlock('storiesColumns')).toBe(true)
  })

  it('accepts one to three columns', () => {
    const parsed = parseBlockData('storiesColumns', { columns: [column('A'), column('B'), column('C')] })
    expect(parsed.columns).toHaveLength(3)
  })

  it('rejects more than three columns', () => {
    expect(() =>
      parseBlockData('storiesColumns', { columns: [column('A'), column('B'), column('C'), column('D')] }),
    ).toThrow()
  })

  it('rejects zero columns and a column without a category', () => {
    expect(() => parseBlockData('storiesColumns', { columns: [] })).toThrow()
    expect(() => parseBlockData('storiesColumns', { columns: [{ title: 'A', category: '', limit: 3 }] })).toThrow()
  })

  it('caps each column at five articles', () => {
    expect(() =>
      parseBlockData('storiesColumns', { columns: [{ title: 'A', category: 'A', limit: 6 }] }),
    ).toThrow()
  })
})
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npm test --workspace=shared`
Expected: FAIL — `layout` is `undefined`, and `Unknown block type: storiesColumns`.

- [ ] **Step 3: Update the schemas**

Replace the `newsTeaserSchema` and `eventsTeaserSchema` definitions in `shared/src/blocks/references.ts`, and add `storiesColumnsSchema` after `downloadsListSchema`:

```ts
export const newsTeaserSchema = z
  .object({
    heading: z.string().max(120).optional(),
    limit: z.number().int().min(1).max(9).default(3),
    category: z.string().max(60).nullable().default(null),
    // `grid` is the default so blocks saved before this option existed keep
    // their appearance. New blocks are created as `featured` by the registry.
    layout: z.enum(['featured', 'grid']).default('grid'),
  })
  .refine((d) => d.layout !== 'featured' || d.limit >= 3, {
    message: 'The featured layout shows at least 3 articles',
    path: ['limit'],
  })

export const eventsTeaserSchema = z.object({
  heading: z.string().max(120).optional(),
  limit: z.number().int().min(1).max(9).default(3),
  layout: z.enum(['featured', 'list']).default('list'),
})
```

```ts
/**
 * Up to three columns, each listing recent articles from one news category —
 * the "Voices" row on the reference site.
 */
export const storiesColumnsSchema = z.object({
  heading: z.string().max(120).optional(),
  columns: z
    .array(
      z.object({
        title: z.string().min(1, 'Each column needs a title').max(60),
        category: z.string().min(1, 'Each column needs a category').max(60),
        limit: z.number().int().min(1).max(5).default(3),
      }),
    )
    .min(1)
    .max(3),
})
```

Replace `REFERENCE_BLOCK_TYPES`:

```ts
export const REFERENCE_BLOCK_TYPES = [
  'newsTeaser',
  'eventsTeaser',
  'staffGrid',
  'downloadsList',
  'storiesColumns',
] as const
```

- [ ] **Step 4: Register the block**

In `shared/src/blocks/index.ts`:

Add `storiesColumnsSchema` to the import from `./references.js`.

Add `'storiesColumns'` as the last entry of `BLOCK_TYPES`.

Change the `newsTeaser` and `eventsTeaser` defaults, and add the `storiesColumns` entry after `downloadsList`:

```ts
    defaults: () => ({ heading: 'Latest news', limit: 3, category: null, layout: 'featured' as const }),
```

```ts
    defaults: () => ({ heading: 'Upcoming events', limit: 3, layout: 'featured' as const }),
```

```ts
  storiesColumns: {
    type: 'storiesColumns',
    label: 'Stories columns',
    description: 'Up to three columns, each listing recent articles from one news category.',
    schema: storiesColumnsSchema,
    defaults: () => ({ heading: '', columns: [{ title: '', category: '', limit: 3 }] }),
  },
```

- [ ] **Step 5: Run the tests**

Run: `npm test --workspace=shared`
Expected: 10 passed.

- [ ] **Step 6: Add a layout choice to the shared reference editor**

In `web/app/components/admin/blocks/ReferenceEditor.vue`, add a `layouts` prop, a `layout` field, and a radio group.

Replace the `defineProps` call:

```ts
const props = defineProps<{
  filter?: 'category' | 'department' | 'none'
  showLimit?: boolean
  /** Options for the filter dropdown, discovered from existing content. */
  options?: string[]
  /** Layout choices; omitted for blocks with a single layout. */
  layouts?: Array<{ value: string; label: string; hint: string }>
  note: string
}>()
```

After `const limit = field<number>('limit')`, add:

```ts
const layout = field<string>('layout')
```

Insert directly after the heading `UiField` in the template:

```vue
    <fieldset v-if="layouts?.length">
      <legend class="mb-1.5 text-sm font-semibold text-ink">Layout</legend>
      <div class="space-y-2">
        <label v-for="l in layouts" :key="l.value" class="flex items-start gap-2 text-sm">
          <input v-model="layout" type="radio" :value="l.value" class="mt-1 accent-maroon" />
          <span>
            <span class="font-medium text-ink">{{ l.label }}</span>
            <span class="block text-xs text-ink-muted">{{ l.hint }}</span>
          </span>
        </label>
      </div>
    </fieldset>
```

- [ ] **Step 7: Offer layouts in the news and events editors**

Replace `web/app/components/admin/blocks/NewsTeaserEditor.vue`:

```vue
<script setup lang="ts">
const model = defineModel<Record<string, unknown>>({ required: true })

const layouts = [
  { value: 'featured', label: 'Featured', hint: 'One large story beside two smaller ones. Shows at least 3.' },
  { value: 'grid', label: 'Grid', hint: 'Equal cards in rows of three.' },
]
</script>

<template>
  <AdminBlocksReferenceEditor
    v-model="model"
    filter="category"
    :show-limit="true"
    :layouts="layouts"
    note="Articles appear here automatically as you publish them. You do not need to edit this block again."
  />
</template>
```

Replace `web/app/components/admin/blocks/EventsTeaserEditor.vue`:

```vue
<script setup lang="ts">
const model = defineModel<Record<string, unknown>>({ required: true })

const layouts = [
  { value: 'featured', label: 'Featured', hint: 'The next event large with its picture, the rest listed beside it.' },
  { value: 'list', label: 'List', hint: 'A simple dated list.' },
]
</script>

<template>
  <AdminBlocksReferenceEditor
    v-model="model"
    filter="none"
    :show-limit="true"
    :layouts="layouts"
    note="Events appear here automatically and drop off once they finish."
  />
</template>
```

- [ ] **Step 8: Create the stories columns editor**

`web/app/components/admin/blocks/StoriesColumnsEditor.vue`:

```vue
<script setup lang="ts">
interface Column {
  title: string
  category: string
  limit: number
}

const model = defineModel<Record<string, unknown>>({ required: true })

// Categories that already have articles. Picking from this list (rather than
// typing) means a typo cannot create a column that stays empty forever.
const categories = ref<string[]>([])
onMounted(async () => {
  try {
    categories.value = (await $fetch<{ categories: string[] }>('/api/content/posts/categories')).categories
  } catch {
    categories.value = []
  }
})

const heading = computed({
  get: () => (model.value.heading as string | undefined) ?? '',
  set: (v: string) => (model.value = { ...model.value, heading: v }),
})

const columns = computed<Column[]>(() => (model.value.columns as Column[] | undefined) ?? [])

function setColumns(next: Column[]) {
  model.value = { ...model.value, columns: next }
}

function update(i: number, patch: Partial<Column>) {
  setColumns(columns.value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
}

function add() {
  if (columns.value.length < 3) setColumns([...columns.value, { title: '', category: '', limit: 3 }])
}

function remove(i: number) {
  setColumns(columns.value.filter((_, idx) => idx !== i))
}

function move(i: number, delta: number) {
  const j = i + delta
  if (j < 0 || j >= columns.value.length) return
  const next = [...columns.value]
  const [col] = next.splice(i, 1)
  next.splice(j, 0, col!)
  setColumns(next)
}

/** Keep a stored category selectable even if no article uses it any more. */
const optionsFor = (current: string) =>
  current && !categories.value.includes(current) ? [current, ...categories.value] : categories.value
</script>

<template>
  <div class="space-y-5">
    <UiField v-model="heading" label="Heading" hint="Optional. Leave empty and each column title acts as the heading." />

    <div v-for="(col, i) in columns" :key="i" class="rounded-card border border-hairline p-4">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-maroon">Column {{ i + 1 }}</p>
        <div class="flex gap-1">
          <UiButton variant="ghost" :disabled="i === 0" title="Move left" @click="move(i, -1)">←</UiButton>
          <UiButton variant="ghost" :disabled="i === columns.length - 1" title="Move right" @click="move(i, 1)">→</UiButton>
          <UiButton variant="ghost" :disabled="columns.length === 1" @click="remove(i)">Remove</UiButton>
        </div>
      </div>

      <div class="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_6rem]">
        <UiField
          :model-value="col.title"
          label="Title"
          required
          @update:model-value="update(i, { title: $event })"
        />
        <div>
          <label :for="`col-cat-${i}`" class="block text-sm font-semibold text-ink">Category</label>
          <select
            :id="`col-cat-${i}`"
            :value="col.category"
            class="mt-1.5 w-full rounded-card border border-hairline bg-white px-3 py-2.5 text-base"
            @change="update(i, { category: ($event.target as HTMLSelectElement).value })"
          >
            <option value="" disabled>Choose…</option>
            <option v-for="c in optionsFor(col.category)" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div>
          <label :for="`col-limit-${i}`" class="block text-sm font-semibold text-ink">Show</label>
          <input
            :id="`col-limit-${i}`"
            :value="col.limit"
            type="number"
            min="1"
            max="5"
            class="mt-1.5 w-full rounded-card border border-hairline px-3 py-2.5 text-base"
            @input="update(i, { limit: Number(($event.target as HTMLInputElement).value) })"
          />
        </div>
      </div>
    </div>

    <p v-if="!categories.length" class="text-xs text-ink-muted">
      No news categories exist yet. Give some articles a category first.
    </p>

    <UiButton v-if="columns.length < 3" variant="secondary" @click="add">Add a column</UiButton>
  </div>
</template>
```

- [ ] **Step 9: Register the editor**

In `web/app/components/admin/BlockEditor.vue`, add the import beside the other editor imports:

```ts
import StoriesColumnsEditor from '~/components/admin/blocks/StoriesColumnsEditor.vue'
```

and add the entry as the last line of `EDITORS`:

```ts
  storiesColumns: StoriesColumnsEditor,
```

- [ ] **Step 10: Typecheck everything**

Run: `npm run typecheck`
Expected: no `error TS` lines in any workspace. (Before Step 9 the web workspace reports a missing `storiesColumns` key in `EDITORS` — that is the coupling this task exists to resolve.)

- [ ] **Step 11: Commit**

```bash
git add shared/src/blocks web/app/components/admin/blocks web/app/components/admin/BlockEditor.vue
git commit -m "feat(blocks): featured layouts and storiesColumns block with editors" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Navigation tree API

**Files:**
- Modify: `api/src/modules/site/site.service.ts`
- Modify: `api/src/modules/site/site.routes.ts`
- Modify: `web/app/composables/useSite.ts`
- Modify: `web/app/layouts/default.vue` (one-line guard; the file is rewritten in Task 10)
- Test: `api/test/navigation.test.ts`

**Interfaces:**
- Produces (`site.service.ts`):
  ```ts
  export interface NavLinkInput { label: string; pageId?: string | null; url?: string | null; opensNewTab?: boolean }
  export interface NavInputItem extends NavLinkInput { location: 'header' | 'footer'; children?: NavLinkInput[] }
  export const navigationInputSchema: z.ZodType<{ items: NavInputItem[] }>
  export function saveNavigation(items: NavInputItem[], actor: Actor): Promise<…>
  export function exportNavigationTree(): Promise<NavInputItem[]>
  export interface PublicNavLink { id: string; label: string; href: string; opensNewTab: boolean }
  export interface PublicNavItem { id: string; label: string; href: string | null; opensNewTab: boolean; children: PublicNavLink[] }
  export function publicNavigation(): Promise<{ header: PublicNavItem[]; footer: PublicNavItem[] }>
  ```
- Produces: `GET /api/site/navigation` → `{ navigation, tree }`; `PUT` accepts `{ items: NavInputItem[] }`.
- Produces (web): `NavLink`, `NavItem` types in `useSite.ts` matching `PublicNavLink` / `PublicNavItem`.

- [ ] **Step 1: Write the failing test**

`api/test/navigation.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/client.js'
import { pages } from '../src/db/schema/index.js'
import {
  exportNavigationTree,
  navigationInputSchema,
  publicNavigation,
  saveNavigation,
} from '../src/modules/site/site.service.js'
import { actorOf, makeAdmin, truncateAll } from './helpers.js'

async function page(slug: string, status: 'draft' | 'published') {
  return db
    .insert(pages)
    .values({ slug, title: slug, status, publishedAt: status === 'published' ? new Date() : null })
    .returning()
    .then((r) => r[0]!)
}

describe('navigation tree', () => {
  let actor: { id: string; ip: string }

  beforeEach(async () => {
    truncateAll()
    actor = actorOf(await makeAdmin())
  })

  it('round-trips a nested tree, preserving order at both levels', async () => {
    const history = await page('history', 'published')
    const items = [
      { location: 'header' as const, label: 'Home', url: '/' },
      {
        location: 'header' as const,
        label: 'About',
        children: [
          { label: 'History', pageId: history.id },
          { label: 'Staff', url: '/staff' },
        ],
      },
      { location: 'footer' as const, label: 'Contact', url: '/contact' },
    ]

    await saveNavigation(items, actor)
    const tree = await exportNavigationTree()

    expect(tree.map((t) => t.label)).toEqual(['Home', 'About', 'Contact'])
    expect(tree[1]!.children!.map((c) => c.label)).toEqual(['History', 'Staff'])
    expect(tree[1]!.children![0]!.pageId).toBe(history.id)
  })

  it('rejects a grandchild', () => {
    const result = navigationInputSchema.safeParse({
      items: [
        {
          location: 'header',
          label: 'About',
          children: [{ label: 'History', url: '/history', children: [{ label: 'Too deep', url: '/x' }] }],
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('exposes a parent with children as a non-link whose own link becomes the first child', async () => {
    const about = await page('about', 'published')
    await saveNavigation(
      [{ location: 'header', label: 'About', pageId: about.id, children: [{ label: 'Staff', url: '/staff' }] }],
      actor,
    )

    const { header } = await publicNavigation()

    expect(header[0]!.href).toBeNull()
    expect(header[0]!.children.map((c) => [c.label, c.href])).toEqual([
      ['About', '/about'],
      ['Staff', '/staff'],
    ])
  })

  it('hides draft pages, and drops a parent left with nothing to show', async () => {
    const draft = await page('draft-page', 'draft')
    await saveNavigation(
      [
        { location: 'header', label: 'Hidden parent', children: [{ label: 'Draft', pageId: draft.id }] },
        { location: 'header', label: 'Kept parent', children: [{ label: 'Draft', pageId: draft.id }, { label: 'News', url: '/news' }] },
      ],
      actor,
    )

    const { header } = await publicNavigation()

    expect(header.map((h) => h.label)).toEqual(['Kept parent'])
    expect(header[0]!.children.map((c) => c.label)).toEqual(['News'])
  })

  it('keeps a childless item as a plain link', async () => {
    await saveNavigation([{ location: 'footer', label: 'Contact', url: '/contact' }], actor)
    const { footer } = await publicNavigation()
    expect(footer[0]).toMatchObject({ label: 'Contact', href: '/contact', children: [] })
  })
})
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npm test --workspace=api -- navigation`
Expected: FAIL — `exportNavigationTree` and `navigationInputSchema` are not exported.

- [ ] **Step 3: Implement the tree in the service**

In `api/src/modules/site/site.service.ts`:

Add to the imports:

```ts
import { z } from 'zod'
import { newId } from '../../lib/ids.js'
```

Replace `publicNavigation` and `saveNavigation` (keep `listNavigation` unchanged) with:

```ts
export interface NavLinkInput {
  label: string
  pageId?: string | null
  url?: string | null
  opensNewTab?: boolean
}

export interface NavInputItem extends NavLinkInput {
  location: 'header' | 'footer'
  children?: NavLinkInput[]
}

const navLinkInputSchema = z.object({
  label: z.string().min(1).max(80).trim(),
  pageId: z.string().nullish(),
  url: z.string().max(300).nullish(),
  opensNewTab: z.boolean().optional(),
})

/**
 * Exactly one level of nesting. Children are `strict`, so a child carrying its
 * own `children` is rejected rather than silently flattened.
 */
export const navigationInputSchema = z.object({
  items: z
    .array(
      navLinkInputSchema.extend({
        location: z.enum(['header', 'footer']),
        children: z.array(navLinkInputSchema.strict()).max(20).optional(),
      }),
    )
    .max(60),
})

export interface PublicNavLink {
  id: string
  label: string
  href: string
  opensNewTab: boolean
}

export interface PublicNavItem {
  id: string
  label: string
  /** Null when the item opens a dropdown rather than navigating. */
  href: string | null
  opensNewTab: boolean
  children: PublicNavLink[]
}

/**
 * Header and footer trees for the public site.
 *
 * A top-level item with visible children is not itself a link: clicking it
 * opens its panel. If the editor also gave it a page or URL, that link becomes
 * the first child, so nothing they set is silently dropped. Items pointing at
 * unpublished pages are hidden, and a parent left with nothing to show is
 * dropped.
 */
export async function publicNavigation(): Promise<{ header: PublicNavItem[]; footer: PublicNavItem[] }> {
  const rows = await listNavigation()
  type Row = (typeof rows)[number]

  const visible = (r: Row) => !r.pageId || r.pageStatus === 'published'
  const linkOf = (r: Row): PublicNavLink | null =>
    visible(r) && (r.pageId || r.url)
      ? { id: r.id, label: r.label, href: r.href, opensNewTab: r.opensNewTab }
      : null

  const build = (location: 'header' | 'footer'): PublicNavItem[] => {
    const own = rows.filter((r) => r.location === location)

    return own
      .filter((r) => !r.parentId)
      .sort((a, b) => a.seq - b.seq)
      .flatMap((parent): PublicNavItem[] => {
        const children = own
          .filter((c) => c.parentId === parent.id)
          .sort((a, b) => a.seq - b.seq)
          .map(linkOf)
          .filter((l): l is PublicNavLink => l !== null)
        const self = linkOf(parent)

        if (children.length === 0) return self ? [{ ...self, children: [] }] : []

        return [
          {
            id: parent.id,
            label: parent.label,
            href: null,
            opensNewTab: false,
            children: self ? [self, ...children] : children,
          },
        ]
      })
  }

  return { header: build('header'), footer: build('footer') }
}

/** The stored navigation in the same shape `saveNavigation` accepts. */
export async function exportNavigationTree(): Promise<NavInputItem[]> {
  const rows = await listNavigation()
  const strip = (r: (typeof rows)[number]): NavLinkInput => ({
    label: r.label,
    pageId: r.pageId,
    url: r.url,
    opensNewTab: r.opensNewTab,
  })

  return rows
    .filter((r) => !r.parentId)
    .sort((a, b) => (a.location === b.location ? a.seq - b.seq : a.location === 'header' ? -1 : 1))
    .map((p) => ({
      location: p.location,
      ...strip(p),
      children: rows
        .filter((c) => c.parentId === p.id)
        .sort((a, b) => a.seq - b.seq)
        .map(strip),
    }))
}

export async function saveNavigation(items: NavInputItem[], actor: Actor) {
  // Replaced wholesale. Each parent is inserted first with an id generated
  // here, so its children reference a row that exists — the previous flat
  // save regenerated ids and would have orphaned any parentId.
  db.transaction((tx) => {
    tx.delete(navigation).run()
    items.forEach((item, i) => {
      const parentId = newId()
      tx.insert(navigation)
        .values({
          id: parentId,
          location: item.location,
          label: item.label,
          pageId: item.pageId ?? null,
          // A page reference wins over a typed address: it survives renames.
          url: item.pageId ? null : (item.url ?? null),
          parentId: null,
          seq: i,
          opensNewTab: item.opensNewTab ?? false,
        })
        .run()

      ;(item.children ?? []).forEach((child, j) => {
        tx.insert(navigation)
          .values({
            id: newId(),
            location: item.location,
            label: child.label,
            pageId: child.pageId ?? null,
            url: child.pageId ? null : (child.url ?? null),
            parentId,
            seq: j,
            opensNewTab: child.opensNewTab ?? false,
          })
          .run()
      })
    })
  })

  audit({
    actorUserId: actor.id,
    action: 'navigation.saved',
    entity: 'navigation',
    after: { count: items.length },
    ip: actor.ip,
  })

  revalidate(PURGE_EVERYTHING)
  return listNavigation()
}
```

- [ ] **Step 4: Use the schema in the routes**

In `api/src/modules/site/site.routes.ts`, replace the `GET /navigation` and `PUT /navigation` handlers with:

```ts
siteRoutes.get('/navigation', async (_req, res, next) => {
  try {
    const [navigation, tree] = await Promise.all([service.listNavigation(), service.exportNavigationTree()])
    res.json({ navigation, tree })
  } catch (err) {
    next(err)
  }
})

siteRoutes.put('/navigation', async (req, res, next) => {
  try {
    const { items } = service.navigationInputSchema.parse(req.body)
    await service.saveNavigation(items, { id: req.auth!.user.id, ip: req.ip })
    res.json({ tree: await service.exportNavigationTree() })
  } catch (err) {
    next(err)
  }
})
```

- [ ] **Step 5: Run the tests**

Run: `npm test --workspace=api`
Expected: all pass (7).

- [ ] **Step 6: Update the web nav types and guard the current header**

In `web/app/composables/useSite.ts`, replace the `NavItem` interface and the `nav` field of `Chrome`:

```ts
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
```

```ts
  nav: { header: NavItem[]; footer: NavItem[] }
```

In `web/app/layouts/default.vue`, replace every `:to="item.href"` (three occurrences) with:

```vue
:to="item.href ?? item.children[0]?.href ?? '/'"
```

This keeps the current header working for dropdown parents until Task 10 replaces the layout.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: no `error TS` lines.

- [ ] **Step 8: Commit**

```bash
git add api/src/modules/site api/test/navigation.test.ts web/app/composables/useSite.ts web/app/layouts/default.vue
git commit -m "feat(nav): nested navigation tree with one level of children" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Purge pages that contain reference blocks

**Files:**
- Create: `api/src/lib/purge.ts`
- Modify: `api/src/modules/posts/posts.service.ts`
- Modify: `api/src/modules/events/events.service.ts`
- Modify: `api/src/modules/site/site.service.ts`
- Test: `api/test/purge.test.ts`

**Interfaces:**
- Consumes: `BlockType` (includes `storiesColumns`, Task 2).
- Produces: `pathsForBlockTypes(types: BlockType[]): Promise<string[]>` — paths of **published** pages containing any of those block types; `home` maps to `/`.

- [ ] **Step 1: Write the failing test**

`api/test/purge.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/revalidate.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/revalidate.js')>()),
  revalidate: vi.fn(),
}))

import { db } from '../src/db/client.js'
import { pageBlocks, pages } from '../src/db/schema/index.js'
import { pathsForBlockTypes } from '../src/lib/purge.js'
import { revalidate } from '../src/lib/revalidate.js'
import * as posts from '../src/modules/posts/posts.service.js'
import { upsertStaff } from '../src/modules/site/site.service.js'
import { actorOf, makeAdmin, truncateAll } from './helpers.js'

async function pageWith(slug: string, status: 'draft' | 'published', types: string[]) {
  const p = await db
    .insert(pages)
    .values({ slug, title: slug, status, publishedAt: status === 'published' ? new Date() : null })
    .returning()
    .then((r) => r[0]!)
  for (const [seq, type] of types.entries()) {
    await db.insert(pageBlocks).values({ pageId: p.id, seq, type, data: {} })
  }
  return p
}

describe('pathsForBlockTypes', () => {
  beforeEach(truncateAll)

  it('returns published pages containing the given block types, home as /', async () => {
    await pageWith('home', 'published', ['hero', 'newsTeaser'])
    await pageWith('community', 'published', ['storiesColumns'])
    await pageWith('draft-news', 'draft', ['newsTeaser'])
    await pageWith('about', 'published', ['richText'])

    const paths = await pathsForBlockTypes(['newsTeaser', 'storiesColumns'])

    expect(paths.sort()).toEqual(['/', '/community'])
  })

  it('returns nothing for an empty type list', async () => {
    await pageWith('home', 'published', ['newsTeaser'])
    expect(await pathsForBlockTypes([])).toEqual([])
  })
})

describe('purge wiring', () => {
  let actor: { id: string; ip: string }

  beforeEach(async () => {
    truncateAll()
    vi.mocked(revalidate).mockClear()
    actor = actorOf(await makeAdmin())
  })

  it('publishing a post purges pages holding news blocks', async () => {
    await pageWith('parents', 'published', ['storiesColumns'])
    const post = await posts.create({ title: 'Hello', slug: 'hello' }, actor)

    await posts.setStatus(post.id, 'published', null, actor)

    const purged = vi.mocked(revalidate).mock.calls.flatMap((c) => c[0])
    expect(purged).toEqual(expect.arrayContaining(['/news/hello', '/news', '/parents']))
  })

  it('saving staff purges /staff and pages holding a staff grid, not everything', async () => {
    await pageWith('team', 'published', ['staffGrid'])

    await upsertStaff({ name: 'A Teacher', isPublished: true }, actor)

    const purged = vi.mocked(revalidate).mock.calls.flatMap((c) => c[0])
    expect(purged).toEqual(expect.arrayContaining(['/staff', '/team']))
    expect(purged).not.toContain('/**')
  })
})
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npm test --workspace=api -- purge`
Expected: FAIL — cannot resolve `../src/lib/purge.js`.

- [ ] **Step 3: Implement the helper**

`api/src/lib/purge.ts`:

```ts
import { and, eq, inArray } from 'drizzle-orm'
import type { BlockType } from '@cms/shared'
import { db } from '../db/client.js'
import { pageBlocks, pages } from '../db/schema/index.js'

/**
 * Paths of published pages containing any of the given block types.
 *
 * Reference blocks store a query rather than content, so when that content
 * changes every page showing it is stale. This is the lookup the index on
 * `page_blocks.type` exists for.
 */
export async function pathsForBlockTypes(types: BlockType[]): Promise<string[]> {
  if (types.length === 0) return []

  const rows = await db
    .selectDistinct({ slug: pages.slug })
    .from(pageBlocks)
    .innerJoin(pages, eq(pageBlocks.pageId, pages.id))
    .where(and(inArray(pageBlocks.type, types), eq(pages.status, 'published')))

  return rows.map((r) => (r.slug === 'home' ? '/' : `/${r.slug}`))
}
```

- [ ] **Step 4: Wire it into posts**

In `api/src/modules/posts/posts.service.ts`:

Add `import { pathsForBlockTypes } from '../../lib/purge.js'`.

Replace the `purgePaths` function with:

```ts
/** A post changes itself, the index, and every page showing news blocks. */
async function purgePost(...slugs: string[]): Promise<void> {
  revalidate([
    ...slugs.map((s) => `/news/${s}`),
    '/news',
    ...(await pathsForBlockTypes(['newsTeaser', 'storiesColumns'])),
  ])
}
```

Then replace each call:
- in `update`: `revalidate([...purgePaths(after.slug), ...(before.slug !== after.slug ? purgePaths(before.slug) : [])])` → `await purgePost(...new Set([after.slug, before.slug]))`
- in `setStatus`: `revalidate(purgePaths(after.slug))` → `await purgePost(after.slug)`
- in `remove`: `revalidate(purgePaths(row.slug))` → `await purgePost(row.slug)`

- [ ] **Step 5: Wire it into events**

In `api/src/modules/events/events.service.ts`:

Add `import { pathsForBlockTypes } from '../../lib/purge.js'`.

Replace `const purgePaths = () => ['/events', '/']` with:

```ts
async function purgeEvents(): Promise<void> {
  revalidate(['/events', ...(await pathsForBlockTypes(['eventsTeaser']))])
}
```

Replace every `revalidate(purgePaths())` with `await purgeEvents()`.

- [ ] **Step 6: Wire it into staff and downloads**

In `api/src/modules/site/site.service.ts`:

Add `import { pathsForBlockTypes } from '../../lib/purge.js'`.

In `upsertStaff` and `removeStaff`, replace `revalidate(PURGE_EVERYTHING)` with:

```ts
  revalidate(['/staff', ...(await pathsForBlockTypes(['staffGrid']))])
```

In `upsertDownload` and `removeDownload`, replace `revalidate(PURGE_EVERYTHING)` with:

```ts
  revalidate(['/downloads', ...(await pathsForBlockTypes(['downloadsList']))])
```

Settings, navigation and announcements keep `PURGE_EVERYTHING`.

- [ ] **Step 7: Run tests and typecheck**

Run: `npm test --workspace=api`
Expected: all pass (11).

Run: `npm run typecheck --workspace=api`
Expected: no `error TS` lines.

- [ ] **Step 8: Commit**

```bash
git add api/src/lib/purge.ts api/src/modules/posts/posts.service.ts api/src/modules/events/events.service.ts api/src/modules/site/site.service.ts api/test/purge.test.ts
git commit -m "fix(cache): purge every page showing changed reference content" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Event cover images

**Files:**
- Modify: `api/src/modules/events/events.service.ts`
- Modify: `api/src/modules/events/events.routes.ts`
- Modify: `web/app/pages/admin/events.vue`
- Test: `api/test/events.test.ts`

**Interfaces:**
- Produces: `listPublic(limit, includePast)` items gain `cover: PublicMedia | null` (the shape returned by `media.service` `toPublic`).
- Produces: `update(id, patch, actor)` accepts `coverMediaId?: string | null`; `PATCH /api/events/:id` accepts it.

- [ ] **Step 1: Write the failing test**

`api/test/events.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/client.js'
import { media } from '../src/db/schema/index.js'
import * as events from '../src/modules/events/events.service.js'
import { actorOf, makeAdmin, truncateAll } from './helpers.js'

describe('event covers', () => {
  let actor: { id: string; ip: string }

  beforeEach(async () => {
    truncateAll()
    actor = actorOf(await makeAdmin())
  })

  it('sets a cover and returns it resolved in the public list', async () => {
    const photo = await db
      .insert(media)
      .values({
        filename: 'fair.jpg',
        storagePath: '2026/09/fair.jpg',
        mime: 'image/jpeg',
        size: 1000,
        width: 1600,
        height: 900,
        alt: 'Science fair tables',
        uploadedBy: actor.id,
      })
      .returning()
      .then((r) => r[0]!)

    const event = await events.create(
      { title: 'Fair', slug: 'fair', startsAt: new Date(Date.now() + 86_400_000) },
      actor,
    )
    await events.update(event.id, { coverMediaId: photo.id }, actor)
    await events.setStatus(event.id, 'published', actor)

    const [listed] = await events.listPublic(5, false)

    expect(listed!.cover).toMatchObject({ id: photo.id, alt: 'Science fair tables', url: '/media/2026/09/fair.jpg' })
  })

  it('returns a null cover when none is set', async () => {
    const event = await events.create(
      { title: 'Plain', slug: 'plain', startsAt: new Date(Date.now() + 86_400_000) },
      actor,
    )
    await events.setStatus(event.id, 'published', actor)

    const [listed] = await events.listPublic(5, false)
    expect(listed!.cover).toBeNull()
  })
})
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npm test --workspace=api -- events`
Expected: FAIL — `cover` is `undefined`.

- [ ] **Step 3: Resolve covers and accept `coverMediaId`**

In `api/src/modules/events/events.service.ts`:

Add to the imports:

```ts
import { inArray } from 'drizzle-orm'
import { media } from '../../db/schema/index.js'
import { toPublic as mediaToPublic } from '../media/media.service.js'
```

(merge `inArray` into the existing `drizzle-orm` import and `media` into the existing schema import).

Replace the `return filtered.slice(0, limit).map(…)` statement at the end of `listPublic` with:

```ts
  const page = filtered.slice(0, limit)
  const coverIds = [...new Set(page.map((e) => e.coverMediaId).filter((v): v is string => !!v))]
  const covers = coverIds.length
    ? (await db.select().from(media).where(inArray(media.id, coverIds))).map(mediaToPublic)
    : []

  return page.map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    allDay: e.allDay,
    location: e.location,
    description: e.description,
    cover: covers.find((c) => c.id === e.coverMediaId) ?? null,
  }))
```

In `update`, add `coverMediaId?: string | null` to the `patch` parameter type, and add this line to the `.set({…})` object after the `location` line:

```ts
      ...(patch.coverMediaId !== undefined ? { coverMediaId: patch.coverMediaId } : {}),
```

In `api/src/modules/events/events.routes.ts`, add to the PATCH schema after `location`:

```ts
        coverMediaId: z.string().nullable().optional(),
```

- [ ] **Step 4: Run tests**

Run: `npm test --workspace=api`
Expected: all pass (13).

- [ ] **Step 5: Add an edit panel to the Events admin**

In `web/app/pages/admin/events.vue`:

Add to the `<script setup>` after `const draft = reactive(…)`:

```ts
interface EventDetail extends EventRow {
  description: import('@cms/shared').RichTextDoc | null
  coverMediaId: string | null
}

const editing = ref<{
  id: string
  title: string
  startsAt: string
  endsAt: string
  allDay: boolean
  location: string
  description: import('@cms/shared').RichTextDoc
  coverMediaId: string | null
} | null>(null)
const saving = ref(false)

/** `datetime-local` wants local wall-clock time with no zone or seconds. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function startEdit(e: EventRow) {
  error.value = ''
  try {
    const { event } = await $fetch<{ event: EventDetail }>(`/api/events/${e.id}`, { credentials: 'include' })
    editing.value = {
      id: event.id,
      title: event.title,
      startsAt: toLocalInput(event.startsAt),
      endsAt: toLocalInput(event.endsAt),
      allDay: event.allDay,
      location: event.location ?? '',
      description: event.description ?? { type: 'doc', content: [] },
      coverMediaId: event.coverMediaId,
    }
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not load that event.')
  }
}

async function saveEdit() {
  if (!editing.value) return
  error.value = ''
  saving.value = true
  try {
    await $fetch(`/api/events/${editing.value.id}`, {
      method: 'PATCH',
      body: {
        title: editing.value.title,
        startsAt: new Date(editing.value.startsAt).toISOString(),
        endsAt: editing.value.endsAt ? new Date(editing.value.endsAt).toISOString() : null,
        allDay: editing.value.allDay,
        location: editing.value.location || null,
        description: editing.value.description,
        coverMediaId: editing.value.coverMediaId,
      },
      credentials: 'include',
    })
    editing.value = null
    notice.value = 'Event saved.'
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not save the event.')
  } finally {
    saving.value = false
  }
}

const coverId = computed({
  get: () => editing.value?.coverMediaId ?? null,
  set: (v: string | null) => editing.value && (editing.value.coverMediaId = v),
})
const description = computed({
  get: () => editing.value!.description,
  set: (v) => editing.value && (editing.value.description = v),
})
```

In the template, insert this form directly before the `<p v-if="!rows.length"` element:

```vue
    <form
      v-if="editing"
      class="mt-6 space-y-4 rounded-card border border-hairline bg-white p-5"
      @submit.prevent="saveEdit"
    >
      <h2 class="text-sm font-bold uppercase tracking-wider text-ink-muted">Edit event</h2>

      <UiField v-model="editing.title" label="Title" required />

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="edit-starts" class="block text-sm font-semibold text-ink">Starts</label>
          <input
            id="edit-starts"
            v-model="editing.startsAt"
            type="datetime-local"
            required
            class="mt-1.5 w-full rounded-card border border-hairline px-3 py-2.5 text-base"
          />
        </div>
        <div>
          <label for="edit-ends" class="block text-sm font-semibold text-ink">Ends</label>
          <input
            id="edit-ends"
            v-model="editing.endsAt"
            type="datetime-local"
            class="mt-1.5 w-full rounded-card border border-hairline px-3 py-2.5 text-base"
          />
          <p class="mt-1.5 text-xs text-ink-muted">Optional. Events stay listed until they end.</p>
        </div>
      </div>

      <label class="flex items-center gap-2 text-sm">
        <input v-model="editing.allDay" type="checkbox" class="accent-maroon" />
        All day
      </label>

      <UiField v-model="editing.location" label="Location" hint="Optional." />

      <AdminMediaPicker v-model="coverId" label="Picture" />
      <p class="text-xs text-ink-muted">
        Shown when this is the next event on the homepage. Without one, a large date is shown instead.
      </p>

      <AdminRichTextInput v-model="description" label="Description" />

      <div class="flex gap-2">
        <UiButton type="submit" :loading="saving">Save event</UiButton>
        <UiButton variant="ghost" @click="editing = null">Cancel</UiButton>
      </div>
    </form>
```

In the event list row, insert an Edit button before the publish/unpublish button:

```vue
        <UiButton variant="secondary" @click="startEdit(e)">Edit</UiButton>
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no `error TS` lines.

- [ ] **Step 7: Verify the admin panel by hand**

With `npm run dev` running, sign in at `http://127.0.0.1:3100/admin/login`, open **Events**, click **Edit** on any event, choose a picture, change the location, and save.
Expected: "Event saved." appears; clicking **Edit** again shows the saved picture and location.

- [ ] **Step 8: Commit**

```bash
git add api/src/modules/events api/test/events.test.ts web/app/pages/admin/events.vue
git commit -m "feat(events): cover images and an edit panel for existing events" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Related articles

**Files:**
- Modify: `api/src/modules/posts/posts.service.ts`
- Test: `api/test/posts.test.ts`

**Interfaces:**
- Produces: `getPublicBySlug(slug)` returns `{ post, related }`, where `related` is up to 3 published posts in the same category, newest first, excluding the post itself (`[]` when it has no category). Each item has the same shape as a `listPublic` item: `{ id, slug, title, excerpt, category, publishedAt, cover }`.

- [ ] **Step 1: Write the failing test**

`api/test/posts.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import * as posts from '../src/modules/posts/posts.service.js'
import { actorOf, makeAdmin, truncateAll } from './helpers.js'

const DAY = 86_400_000

describe('posts', () => {
  let actor: { id: string; ip: string }

  async function publish(slug: string, category: string | null, daysAgo: number) {
    const post = await posts.create({ title: slug, slug }, actor)
    await posts.update(post.id, { category }, actor)
    await posts.setStatus(post.id, 'published', new Date(Date.now() - daysAgo * DAY), actor)
    return post
  }

  beforeEach(async () => {
    truncateAll()
    actor = actorOf(await makeAdmin())
  })

  it('returns up to three related posts from the same category, newest first, excluding itself', async () => {
    await publish('main', 'Student Life', 1)
    await publish('sl-2', 'Student Life', 2)
    await publish('sl-3', 'Student Life', 3)
    await publish('sl-4', 'Student Life', 4)
    await publish('sl-5', 'Student Life', 5)
    await publish('other', 'Community', 1)
    const draft = await posts.create({ title: 'draft', slug: 'draft' }, actor)
    await posts.update(draft.id, { category: 'Student Life' }, actor)

    const result = await posts.getPublicBySlug('main')

    expect('related' in result && result.related.map((r) => r.slug)).toEqual(['sl-2', 'sl-3', 'sl-4'])
  })

  it('returns no related posts for an uncategorised article', async () => {
    await publish('lonely', null, 1)
    await publish('another', null, 2)

    const result = await posts.getPublicBySlug('lonely')

    expect('related' in result && result.related).toEqual([])
  })

  it('pages through the public list with limit and offset', async () => {
    for (let i = 1; i <= 5; i++) await publish(`p-${i}`, null, i)

    const { posts: page, total } = await posts.listPublic(2, 2)

    expect(total).toBe(5)
    expect(page.map((p) => p.slug)).toEqual(['p-3', 'p-4'])
  })

  it('filters the public list by category, counting only that category', async () => {
    await publish('c-1', 'Community', 1)
    await publish('s-1', 'Student Life', 2)
    await publish('c-2', 'Community', 3)

    const { posts: page, total } = await posts.listPublic(10, 0, 'Community')

    expect(total).toBe(2)
    expect(page.map((p) => p.slug)).toEqual(['c-1', 'c-2'])
  })
})
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npm test --workspace=api -- posts`
Expected: the two `related` tests FAIL (`result.related` is `undefined`); the pagination and category tests pass, confirming existing behaviour.

- [ ] **Step 3: Implement `related`**

In `api/src/modules/posts/posts.service.ts`, add this function after `withCovers`:

```ts
/** Other live posts in the same category, for "More from …" beneath an article. */
async function relatedPosts(post: { id: string; category: string | null }, limit = 3) {
  if (!post.category) return []

  const rows = await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.status, 'published'),
        lte(posts.publishedAt, new Date()),
        eq(posts.category, post.category),
        ne(posts.id, post.id),
      ),
    )
    .orderBy(desc(posts.publishedAt))
    .limit(limit)

  return withCovers(rows)
}
```

In `getPublicBySlug`, change the final `return { post: { … } }` so the object also carries `related`:

```ts
  return {
    post: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      body: row.body,
      category: row.category,
      publishedAt: row.publishedAt,
      seo: row.seo,
      cover,
    },
    related: await relatedPosts(row),
  }
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test --workspace=api`
Expected: all pass (17).

Run: `npm run typecheck --workspace=api`
Expected: no `error TS` lines.

- [ ] **Step 5: Commit**

```bash
git add api/src/modules/posts/posts.service.ts api/test/posts.test.ts
git commit -m "feat(posts): related articles from the same category" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Resolve `storiesColumns`

**Files:**
- Modify: `api/src/modules/pages/references.ts`
- Test: `api/test/references.test.ts`

**Interfaces:**
- Consumes: `storiesColumnsSchema` shape (Task 2); `listPublic(limit, offset, category)` from `posts.service`.
- Produces: `refs[blockId]` for a `storiesColumns` block is `Array<{ title: string; category: string; posts: PostSummary[] }>` in column order.

- [ ] **Step 1: Write the failing test**

`api/test/references.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import * as posts from '../src/modules/posts/posts.service.js'
import { resolveReferences } from '../src/modules/pages/references.js'
import { actorOf, makeAdmin, truncateAll } from './helpers.js'

const DAY = 86_400_000

describe('storiesColumns resolution', () => {
  let actor: { id: string; ip: string }

  async function publish(slug: string, category: string, daysAgo: number) {
    const post = await posts.create({ title: slug, slug }, actor)
    await posts.update(post.id, { category }, actor)
    await posts.setStatus(post.id, 'published', new Date(Date.now() - daysAgo * DAY), actor)
  }

  beforeEach(async () => {
    truncateAll()
    actor = actorOf(await makeAdmin())
    await publish('a-1', 'A', 1)
    await publish('a-2', 'A', 2)
    await publish('a-3', 'A', 3)
    await publish('b-1', 'B', 1)
  })

  it('returns each column’s posts, limited, in column order', async () => {
    const refs = await resolveReferences([
      {
        id: 'block-1',
        type: 'storiesColumns',
        data: {
          columns: [
            { title: 'Column B', category: 'B', limit: 3 },
            { title: 'Column A', category: 'A', limit: 2 },
          ],
        },
      },
    ])

    const columns = refs['block-1'] as Array<{ title: string; category: string; posts: Array<{ slug: string }> }>

    expect(columns.map((c) => c.title)).toEqual(['Column B', 'Column A'])
    expect(columns[0]!.posts.map((p) => p.slug)).toEqual(['b-1'])
    expect(columns[1]!.posts.map((p) => p.slug)).toEqual(['a-1', 'a-2'])
  })

  it('returns an empty post list for a category with no articles', async () => {
    const refs = await resolveReferences([
      { id: 'block-2', type: 'storiesColumns', data: { columns: [{ title: 'Empty', category: 'Nope', limit: 3 }] } },
    ])

    expect(refs['block-2']).toEqual([{ title: 'Empty', category: 'Nope', posts: [] }])
  })
})
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npm test --workspace=api -- references`
Expected: FAIL — `refs['block-1']` is `undefined`.

- [ ] **Step 3: Implement the case**

In `api/src/modules/pages/references.ts`, add this case inside the `switch`, after `downloadsList`:

```ts
        case 'storiesColumns': {
          const columns = (Array.isArray(data.columns) ? data.columns : []) as Array<{
            title: string
            category: string
            limit?: number
          }>

          refs[block.id] = await Promise.all(
            columns.map(async (column) => {
              const limit = Number(column.limit ?? 3)
              // Same cache key shape as newsTeaser, so a teaser and a column
              // asking for the same category share one query.
              const key = `posts:${limit}:${column.category}`
              const result = await once(key, () => listPosts(limit, 0, column.category))
              return { title: column.title, category: column.category, posts: result.posts }
            }),
          )
          break
        }
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test --workspace=api`
Expected: all pass (19).

Run: `npm run typecheck --workspace=api`
Expected: no `error TS` lines.

- [ ] **Step 5: Commit**

```bash
git add api/src/modules/pages/references.ts api/test/references.test.ts
git commit -m "feat(blocks): resolve storiesColumns server-side" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Demo photos — approval, download, credits

This task **stops for user approval** before anything is downloaded.

**Files:**
- Create: `api/src/demo/photos.ts`
- Create: `docs/demo-image-credits.md`
- Download (gitignored, not committed): `api/data/demo-images/*.jpg`

**Interfaces:**
- Produces (`api/src/demo/photos.ts`):
  ```ts
  export const PHOTO_ROLES: readonly [
    'hero', 'post-1', 'post-2', 'post-3', 'post-4', 'post-5', 'post-6',
    'event-1', 'event-2', 'event-3', 'history-1', 'history-2',
    'staff-1', 'staff-2', 'staff-3', 'staff-4', 'staff-5', 'staff-6',
  ]
  export type PhotoRole = (typeof PHOTO_ROLES)[number]
  export interface DemoPhoto { alt: string; credit: string; sourceUrl: string }
  export const DEMO_PHOTOS: Record<PhotoRole, DemoPhoto>
  export const photoFile: (role: PhotoRole) => string   // `${role}.jpg`
  ```

**Role requirements:**

| Role | Orientation | Subject |
|---|---|---|
| `hero` | landscape ≥ 2400px wide | School building, courtyard or assembly — wide, calm, space for overlaid text |
| `post-1` | landscape | Principal / teacher addressing pupils or parents (Principal's Corner — "Welcome to the school year") |
| `post-2` | landscape | Children doing a science project (Student Life — science fair) |
| `post-3` | landscape | Children playing sport outdoors (Student Life — intramurals) |
| `post-4` | landscape | Children reading books (Student Life — reading month) |
| `post-5` | landscape | Volunteers cleaning a beach or shoreline (Community — clean-up drive) |
| `post-6` | landscape | People packing donation boxes (Community — relief donations) |
| `event-1` | landscape | Flags, banners or a celebration at a school (Foundation Day) |
| `event-2` | landscape | Parent and teacher talking at a desk (parent–teacher conference) |
| `event-3` | landscape | Children performing on a stage (culminating programme) |
| `history-1` | landscape | An older school building or archive photograph |
| `history-2` | landscape | Classroom with desks |
| `staff-1` … `staff-6` | portrait | Professional headshots of six different adults; 2 read as senior leadership |

**Rules for choosing:**
- Only photos under the **Unsplash License**. Skip anything marked **Unsplash+** (a paid licence).
- Prefer South-East Asian subjects and settings where available.
- No logos, school crests or legible real institution names in frame.
- No photo reused for two roles.

- [ ] **Step 1: Find candidates**

For each role, search with WebSearch restricted to `unsplash.com`, for example `classroom children reading` or `school building courtyard`. Open each candidate's photo page with WebFetch and record:
- photo page URL (`https://unsplash.com/photos/…`)
- photographer name
- licence shown on the page (must be "Unsplash License")
- the `og:image` URL (starts `https://images.unsplash.com/photo-`)
- a one-sentence description of exactly what the photo shows (becomes alt text)

- [ ] **Step 2: STOP — present the list and wait for approval**

Post this table to the user, one row per role, and wait for an explicit yes. Do not download anything before that.

```markdown
| # | Role | What it shows | Photographer | Photo page | Approx. download |
|---|------|---------------|--------------|------------|------------------|
| 1 | hero | … | … | https://unsplash.com/photos/… | ~600 KB (2400px JPEG) |
```

Tell the user in the same message:
- files are saved to `api/data/demo-images/`, which is gitignored and never committed
- total download is roughly 18 × 0.3–0.8 MB
- some photos show children; they are model-released stock images, captioned `PLACEHOLDER — replace before launch` in the media library

If the user rejects rows, replace those rows and ask again.

- [ ] **Step 3: Download the approved photos**

For each approved row, build the download URL from its `og:image` by keeping everything before `?` and appending the size parameters. Portraits use `w=1200`; everything else `w=2400`:

```bash
cd "E:/Development/Web_Development/School Website"
mkdir -p api/data/demo-images
curl -L --fail -o "api/data/demo-images/hero.jpg" "https://images.unsplash.com/photo-XXXXXXXXXXXXX-XXXXXXXXXXXX?w=2400&q=80&fm=jpg&fit=max"
```

Repeat for all 18 roles, naming each file `<role>.jpg`.

- [ ] **Step 4: Verify every file**

```bash
cd "E:/Development/Web_Development/School Website/api"
node -e '
const sharp = require("sharp"); const fs = require("fs");
const roles = ["hero","post-1","post-2","post-3","post-4","post-5","post-6","event-1","event-2","event-3","history-1","history-2","staff-1","staff-2","staff-3","staff-4","staff-5","staff-6"];
(async () => {
  let bad = 0;
  for (const r of roles) {
    const f = `data/demo-images/${r}.jpg`;
    if (!fs.existsSync(f)) { console.log("MISSING", f); bad++; continue; }
    const buf = fs.readFileSync(f);
    const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const { width, height } = await sharp(buf).metadata();
    const portrait = r.startsWith("staff-");
    const ok = jpeg && buf.length < 10 * 1024 * 1024 && (portrait ? height > width : width >= 1600);
    if (!ok) bad++;
    console.log(ok ? "ok  " : "BAD ", r, `${width}x${height}`, `${Math.round(buf.length / 1024)} KB`);
  }
  process.exit(bad ? 1 : 0);
})();'
```

Expected: 18 `ok` lines, exit code 0. Every file is a real JPEG under the 10 MB upload limit, landscape roles are at least 1600px wide, and portraits are taller than wide.

- [ ] **Step 5: Record the photos in code**

Create `api/src/demo/photos.ts`. Fill every entry from the approved table: `alt` is the one-sentence description, `credit` is `Photo by <photographer> on Unsplash`, and `sourceUrl` is the photo page. Every entry must be a real value from the table.

```ts
/**
 * Stock photos used by `npm run seed:demo`. The image files themselves live in
 * api/data/demo-images/ (gitignored); only their descriptions are committed.
 * Licence: Unsplash License — https://unsplash.com/license
 */
export const PHOTO_ROLES = [
  'hero',
  'post-1',
  'post-2',
  'post-3',
  'post-4',
  'post-5',
  'post-6',
  'event-1',
  'event-2',
  'event-3',
  'history-1',
  'history-2',
  'staff-1',
  'staff-2',
  'staff-3',
  'staff-4',
  'staff-5',
  'staff-6',
] as const

export type PhotoRole = (typeof PHOTO_ROLES)[number]

export interface DemoPhoto {
  /** Describes exactly what this photo shows, for screen-reader users. */
  alt: string
  credit: string
  sourceUrl: string
}

export const photoFile = (role: PhotoRole): string => `${role}.jpg`

export const DEMO_PHOTOS: Record<PhotoRole, DemoPhoto> = {
  hero: { alt: '…', credit: 'Photo by … on Unsplash', sourceUrl: 'https://unsplash.com/photos/…' },
  // …one entry per role, all 18, values copied from the approved table
}
```

Then check nothing was left unfilled:

Run: `grep -c "…" api/src/demo/photos.ts`
Expected: `0`

- [ ] **Step 6: Write the credits page**

Create `docs/demo-image-credits.md`:

```markdown
# Demo image credits

Photos used by `npm run seed:demo`, all under the [Unsplash License](https://unsplash.com/license).
They are placeholders for layout review only and are captioned
"PLACEHOLDER — replace before launch" in the media library.
Remove them with `npm run seed:demo -- --remove`.

| Role | Photographer | Source |
|------|--------------|--------|
```

Add one row per role from `DEMO_PHOTOS`.

- [ ] **Step 7: Typecheck and commit**

Run: `npm run typecheck --workspace=api`
Expected: no `error TS` lines.

```bash
git add api/src/demo/photos.ts docs/demo-image-credits.md
git commit -m "chore(demo): approved stock photo list and credits" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: `seed:demo` with exact removal

**Files:**
- Create: `api/src/demo/pdf.ts`
- Create: `api/src/demo/content.ts`
- Create: `api/src/demo/seed.ts`
- Create: `api/src/scripts/seed-demo.ts`
- Modify: `api/package.json`, `package.json`
- Test: `api/test/demo.test.ts`

**Interfaces:**
- Consumes: `PHOTO_ROLES`, `DEMO_PHOTOS`, `photoFile` (Task 8); `saveNavigation`, `exportNavigationTree`, `NavInputItem`, `getSettings`, `saveSettings`, `upsertStaff`, `upsertDownload`, `removeStaff`, `removeDownload` (`site.service`); `posts.create/update/setStatus/remove`; `events.create/update/setStatus/remove`; `pages.create/saveBlocks/setStatus/getWithBlocks/remove`; `media.upload/remove`.
- Produces:
  ```ts
  export const MANIFEST_KEY = 'demo.manifest'
  export interface DemoManifest { … }   // defined below
  export function readManifest(): Promise<DemoManifest | null>
  export function seedDemo(opts: { imagesDir: string }): Promise<DemoManifest['ids']>
  export function removeDemo(): Promise<void>
  export function samplePdf(title: string, lines: string[]): Buffer
  ```
- Produces: `npm run seed:demo` and `npm run seed:demo -- --remove` from the repo root.

- [ ] **Step 1: Write the failing test**

`api/test/demo.test.ts`:

```ts
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { count, eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/client.js'
import { downloads, events, media, pageBlocks, pages, posts, staff } from '../src/db/schema/index.js'
import { PHOTO_ROLES, photoFile } from '../src/demo/photos.js'
import { readManifest, removeDemo, seedDemo } from '../src/demo/seed.js'
import { samplePdf } from '../src/demo/pdf.js'
import * as postsService from '../src/modules/posts/posts.service.js'
import { exportNavigationTree, getSettings, saveNavigation, saveSettings } from '../src/modules/site/site.service.js'
import { actorOf, makeAdmin, truncateAll } from './helpers.js'

type CountableTable = typeof media | typeof posts | typeof events | typeof staff | typeof downloads

const rows = (table: CountableTable) =>
  db
    .select({ n: count() })
    .from(table as typeof media)
    .then((r) => r[0]!.n)

async function fakeImages(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'demo-images-'))
  for (const role of PHOTO_ROLES) {
    const portrait = role.startsWith('staff-')
    await sharp({
      create: { width: portrait ? 48 : 64, height: portrait ? 64 : 48, channels: 3, background: '#6e1d2b' },
    })
      .jpeg()
      .toFile(path.join(dir, photoFile(role)))
  }
  return dir
}

describe('samplePdf', () => {
  it('produces a file that passes the upload magic-byte check', () => {
    const pdf = samplePdf('Title', ['line one'])
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(pdf.toString('latin1')).toContain('%%EOF')
  })
})

describe('seed:demo', { timeout: 60_000 }, () => {
  let imagesDir: string
  let actor: { id: string; ip: string }

  beforeEach(async () => {
    truncateAll()
    actor = actorOf(await makeAdmin())
    imagesDir = await fakeImages()
  })

  afterAll(async () => {
    await rm('./test/.tmp-media', { recursive: true, force: true })
  })

  it('creates the exact demo content set', async () => {
    await seedDemo({ imagesDir })

    expect(await rows(media)).toBe(20) // 18 photos + 2 PDFs
    expect(await rows(posts)).toBe(9)
    expect(await rows(events)).toBe(5)
    expect(await rows(staff)).toBe(6)
    expect(await rows(downloads)).toBe(2)

    const photos = await db.select().from(media).where(eq(media.mime, 'image/jpeg'))
    expect(photos.every((m) => m.caption === 'PLACEHOLDER — replace before launch')).toBe(true)

    const home = await db.select().from(pages).where(eq(pages.slug, 'home')).then((r) => r[0]!)
    const blocks = await db.select().from(pageBlocks).where(eq(pageBlocks.pageId, home.id))
    expect(blocks.sort((a, b) => a.seq - b.seq).map((b) => b.type)).toEqual([
      'hero',
      'newsTeaser',
      'eventsTeaser',
      'storiesColumns',
    ])

    const tree = await exportNavigationTree()
    expect(tree.find((t) => t.label === 'About')!.children!.map((c) => c.label)).toEqual([
      'History',
      'Mission & Vision',
      'Faculty & Staff',
    ])
  })

  it('keeps the manifest out of public settings and refuses to run twice', async () => {
    await seedDemo({ imagesDir })

    expect(await readManifest()).not.toBeNull()
    expect(await getSettings()).not.toHaveProperty(['demo.manifest'])
    await expect(seedDemo({ imagesDir })).rejects.toThrow(/already seeded/)
  })

  it('refuses when a photo is missing, naming it', async () => {
    await rm(path.join(imagesDir, 'staff-3.jpg'))
    await expect(seedDemo({ imagesDir })).rejects.toThrow(/staff-3\.jpg/)
  })

  it('removes exactly what it created and restores what it replaced', async () => {
    // Pre-existing state the seed will overwrite.
    const home = await db
      .insert(pages)
      .values({ slug: 'home', title: 'Home', status: 'published', publishedAt: new Date() })
      .returning()
      .then((r) => r[0]!)
    await db.insert(pageBlocks).values({ pageId: home.id, seq: 0, type: 'richText', data: { doc: { type: 'doc', content: [] } } })
    await saveNavigation([{ location: 'header', label: 'Only link', url: '/only' }], actor)
    await saveSettings({ 'site.name': 'Before Seeding' }, actor)

    await seedDemo({ imagesDir })

    // Content added by a person after seeding must survive removal.
    const mine = await postsService.create({ title: 'Real article', slug: 'real-article' }, actor)

    await removeDemo()

    expect(await rows(media)).toBe(0)
    expect(await rows(events)).toBe(0)
    expect(await rows(staff)).toBe(0)
    expect(await rows(downloads)).toBe(0)
    expect((await db.select().from(posts)).map((p) => p.id)).toEqual([mine.id])

    const restored = await db.select().from(pageBlocks).where(eq(pageBlocks.pageId, home.id))
    expect(restored.map((b) => b.type)).toEqual(['richText'])
    expect((await exportNavigationTree()).map((t) => t.label)).toEqual(['Only link'])
    expect((await getSettings())['site.name']).toBe('Before Seeding')
    expect(await readManifest()).toBeNull()
  })

  it('removes a homepage it created itself', async () => {
    await seedDemo({ imagesDir })
    await removeDemo()
    expect(await db.select().from(pages).where(eq(pages.slug, 'home'))).toEqual([])
  })
})
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npm test --workspace=api -- demo`
Expected: FAIL — cannot resolve `../src/demo/seed.js`.

- [ ] **Step 3: Write the PDF generator**

`api/src/demo/pdf.ts`:

```ts
/**
 * A minimal one-page PDF (Helvetica, text only), so the demo downloads need no
 * files from the internet. Starts with `%PDF-`, so it passes the same
 * magic-byte check as any uploaded document.
 */
export function samplePdf(title: string, lines: string[]): Buffer {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

  const stream = [
    'BT',
    '/F1 20 Tf',
    '72 740 Td',
    `(${esc(title)}) Tj`,
    '/F1 12 Tf',
    ...lines.flatMap((line) => ['0 -26 Td', `(${esc(line)}) Tj`]),
    'ET',
  ].join('\n')

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'))
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
  })

  const xref = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`

  return Buffer.from(pdf, 'latin1')
}
```

- [ ] **Step 4: Write the demo content**

`api/src/demo/content.ts`:

```ts
import type { RichTextDoc, SiteSettings } from '@cms/shared'
import type { NavInputItem } from '../modules/site/site.service.js'
import type { PhotoRole } from './photos.js'

export const PLACEHOLDER_CAPTION = 'PLACEHOLDER — replace before launch'

export const CATEGORIES = ["Principal's Corner", 'Student Life', 'Community'] as const

const DAY = 86_400_000

const text = (t: string) => ({ type: 'text' as const, text: t })
const p = (t: string) => ({ type: 'paragraph' as const, content: [text(t)] })
const h2 = (t: string) => ({ type: 'heading' as const, attrs: { level: 2 }, content: [text(t)] })
const doc = (...content: unknown[]) => ({ type: 'doc', content }) as RichTextDoc

export const daysAgo = (n: number) => new Date(Date.now() - n * DAY)

/** A wall-clock time in Manila (UTC+8), `days` from today. */
export function manilaTime(days: number, hour: number, minute = 0): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  d.setUTCHours(hour - 8, minute, 0, 0)
  return d
}

export interface DemoPost {
  slug: string
  title: string
  category: (typeof CATEGORIES)[number]
  excerpt: string
  body: RichTextDoc
  cover: PhotoRole | null
  daysAgo: number
}

export const demoPosts: DemoPost[] = [
  {
    slug: 'welcome-to-school-year-2026-2027',
    title: 'Welcome to School Year 2026–2027',
    category: "Principal's Corner",
    excerpt: 'A message to our families as we open a new school year together.',
    body: doc(
      p('Welcome back, and a warm welcome to the families joining us for the first time. The corridors are busy again, and we could not be happier about it.'),
      p('This year our focus is on reading for pleasure and on the small habits of kindness that make a school feel like a community. Thank you for trusting us with your children.'),
    ),
    cover: 'post-1',
    daysAgo: 5,
  },
  {
    slug: 'why-we-read-aloud-every-day',
    title: 'Why We Read Aloud Every Day',
    category: "Principal's Corner",
    excerpt: 'Ten minutes a day of shared reading does more than any worksheet.',
    body: doc(
      p('Every class, every day, begins with a teacher reading aloud. It is the most reliable thing we know for building vocabulary and attention.'),
      p('At home, the same ten minutes works just as well — and the book does not need to be new.'),
    ),
    cover: null,
    daysAgo: 19,
  },
  {
    slug: 'a-note-to-parents-on-screen-time',
    title: 'A Note to Parents on Screen Time',
    category: "Principal's Corner",
    excerpt: 'Practical, unfussy guidance on screens at home during the school week.',
    body: doc(
      p('We are often asked how much screen time is too much. There is no single number, but there are good routines.'),
      p('Screens off at meals and an hour before bed is a sensible place to start.'),
    ),
    cover: null,
    daysAgo: 40,
  },
  {
    slug: 'grade-5-science-fair-2026',
    title: 'Grade 5 Science Fair Winners',
    category: 'Student Life',
    excerpt: 'Water filters, seed experiments and a very persuasive solar oven.',
    body: doc(
      p('Our Grade 5 pupils filled the covered court with thirty projects this week. The judges were impressed by how carefully each group recorded their results.'),
      p('Congratulations to every team — and to the parents who helped carry the volcanoes.'),
    ),
    cover: 'post-2',
    daysAgo: 3,
  },
  {
    slug: 'intramurals-week-highlights',
    title: 'Intramurals Week Highlights',
    category: 'Student Life',
    excerpt: 'Five days of relays, basketball and remarkable sportsmanship.',
    body: doc(
      p('Intramurals Week brought every grade level onto the field. The house cheers could be heard from the gate.'),
      p('Thank you to our teachers for organising the heats and to families for cheering from the sidelines.'),
    ),
    cover: 'post-3',
    daysAgo: 12,
  },
  {
    slug: 'reading-month-book-parade',
    title: 'Reading Month Book Parade',
    category: 'Student Life',
    excerpt: 'Our favourite story characters took over the school for a morning.',
    body: doc(
      p('To close Reading Month, pupils came dressed as characters from their favourite books.'),
      p('Each class then read a short passage aloud from the book they chose.'),
    ),
    cover: 'post-4',
    daysAgo: 26,
  },
  {
    slug: 'families-join-coastal-clean-up-drive',
    title: 'Families Join Coastal Clean-Up Drive',
    category: 'Community',
    excerpt: 'Over a hundred volunteers and more than forty sacks of rubbish collected.',
    body: doc(
      p('Families, teachers and alumni spent a Saturday morning cleaning a stretch of shoreline.'),
      p('Our Grade 6 pupils sorted what was collected and will present their findings in class.'),
    ),
    cover: 'post-5',
    daysAgo: 8,
  },
  {
    slug: 'donations-for-typhoon-affected-families',
    title: 'Donations for Typhoon-Affected Families',
    category: 'Community',
    excerpt: 'Thank you for filling the library with relief packs in a single week.',
    body: doc(
      p('Your generosity filled two hundred relief packs with food, water and hygiene kits.'),
      p('The packs were delivered with the help of our barangay partners.'),
    ),
    cover: 'post-6',
    daysAgo: 33,
  },
  {
    slug: 'welcoming-our-new-library-volunteers',
    title: 'Welcoming Our New Library Volunteers',
    category: 'Community',
    excerpt: 'Parents and grandparents are helping keep the library open at lunchtime.',
    body: doc(
      p('Twelve family members have joined our library volunteer rota this term.'),
      p('If you would like to help, please contact the school office.'),
    ),
    cover: null,
    daysAgo: 50,
  },
]

export interface DemoEvent {
  slug: string
  title: string
  startsAt: Date
  endsAt: Date | null
  allDay: boolean
  location: string
  description: RichTextDoc
  cover: PhotoRole | null
}

export const demoEvents = (): DemoEvent[] => [
  {
    slug: 'foundation-day-2026',
    title: 'Foundation Day',
    startsAt: manilaTime(10, 7),
    endsAt: manilaTime(10, 16),
    allDay: true,
    location: 'School grounds',
    description: doc(p('A day of games, performances and thanks, marking the founding of the school in 1990.')),
    cover: 'event-1',
  },
  {
    slug: 'first-quarter-parent-teacher-conference',
    title: 'First Quarter Parent–Teacher Conference',
    startsAt: manilaTime(18, 13),
    endsAt: manilaTime(18, 17),
    allDay: false,
    location: 'Classrooms',
    description: doc(p('Meet your child’s adviser to talk through the first quarter.')),
    cover: 'event-2',
  },
  {
    slug: 'buwan-ng-wika-culminating-program',
    title: 'Buwan ng Wika Culminating Program',
    startsAt: manilaTime(25, 8),
    endsAt: manilaTime(25, 11),
    allDay: false,
    location: 'Covered court',
    description: doc(p('Poems, songs and short plays in Filipino from every grade level.')),
    cover: 'event-3',
  },
  {
    slug: 'family-day-2026',
    title: 'Family Day',
    startsAt: manilaTime(45, 8),
    endsAt: manilaTime(45, 15),
    allDay: false,
    location: 'School grounds',
    description: doc(p('Games and a picnic for the whole family.')),
    cover: null,
  },
  {
    slug: 'christmas-program-2026',
    title: 'Christmas Program',
    startsAt: manilaTime(70, 9),
    endsAt: manilaTime(70, 12),
    allDay: false,
    location: 'Covered court',
    description: doc(p('Carols and a nativity play before the holiday break.')),
    cover: null,
  },
]

export const demoStaff: Array<{ name: string; roleTitle: string; department: string; photo: PhotoRole }> = [
  { name: 'Dr. Teresa Manalo', roleTitle: 'School Principal', department: 'Leadership', photo: 'staff-1' },
  { name: 'Mr. Ramon Villanueva', roleTitle: 'Assistant Principal for Academics', department: 'Leadership', photo: 'staff-2' },
  { name: 'Ms. Andrea Santos', roleTitle: 'Kindergarten Adviser', department: 'Faculty', photo: 'staff-3' },
  { name: 'Mr. Paolo Garcia', roleTitle: 'Grade 3 Adviser', department: 'Faculty', photo: 'staff-4' },
  { name: 'Mrs. Liza Fernandez', roleTitle: 'Grade 5 Science Teacher', department: 'Faculty', photo: 'staff-5' },
  { name: 'Ms. Joy Ramirez', roleTitle: 'Grade 6 English Teacher', department: 'Faculty', photo: 'staff-6' },
]

export const demoDownloads = [
  {
    title: 'Enrolment Form (sample)',
    description: 'Complete and return to the school office.',
    category: 'Admissions',
    file: 'enrolment-form-sample.pdf',
    alt: 'Sample enrolment form (PDF)',
    pdfTitle: 'Enrolment Form — SAMPLE',
    pdfLines: ['This is a placeholder document for layout review.', 'Replace before launch.'],
  },
  {
    title: 'School Calendar 2026–2027 (sample)',
    description: 'Term dates, holidays and key events.',
    category: 'Calendars',
    file: 'school-calendar-sample.pdf',
    alt: 'Sample school calendar (PDF)',
    pdfTitle: 'School Calendar 2026–2027 — SAMPLE',
    pdfLines: ['This is a placeholder document for layout review.', 'Replace before launch.'],
  },
]

export const demoSettings: Partial<SiteSettings> = {
  'site.description': 'Cherished Moments School is a community school founded in 1990.',
  'contact.address': '12 Mabini Street\nQuezon City 1100',
  'contact.phone': '(02) 8123 4567',
  'contact.email': 'office@cherishedmoments.example',
  'social.facebook': 'https://www.facebook.com/CherishedMomentsSchoolDemo',
}

export const historyBlocks = (photos: { first: string; second: string }) => [
  {
    type: 'imageText',
    data: {
      heading: 'Where we began',
      imageMediaId: photos.first,
      imagePosition: 'left',
      doc: doc(p('The school opened in 1990 with two classrooms and forty pupils, founded by families who wanted a small school where every child was known.')),
    },
  },
  {
    type: 'richText',
    data: {
      doc: doc(
        h2('Growing with our community'),
        p('Over three decades the school has grown room by room, always keeping its classes small.'),
      ),
    },
  },
  {
    type: 'imageText',
    data: {
      heading: 'Today',
      imageMediaId: photos.second,
      imagePosition: 'right',
      doc: doc(p('Our pupils still learn by the same three words on our crest: I Think. I Lead. I Care.')),
    },
  },
]

export const missionBlocks = () => [
  {
    type: 'richText',
    data: {
      doc: doc(
        h2('Our mission'),
        p('To nurture curious, capable and kind learners in a school where every child is known by name.'),
        h2('Our vision'),
        p('Young people who think clearly, lead with integrity and care for others.'),
      ),
    },
  },
]

export const homeBlocks = (heroMediaId: string) => [
  {
    type: 'hero',
    data: {
      title: 'Every child’s potential, cherished and grown.',
      subtitle: 'A community school nurturing learners who think, lead and care — since 1990.',
      imageMediaId: heroMediaId,
      ctas: [
        { label: 'Enrol for 2026–2027', href: '/contact' },
        { label: 'Our history', href: '/history' },
      ],
    },
  },
  { type: 'newsTeaser', data: { heading: 'News', limit: 3, category: null, layout: 'featured' } },
  { type: 'eventsTeaser', data: { heading: 'Upcoming events', limit: 4, layout: 'featured' } },
  {
    type: 'storiesColumns',
    data: { heading: '', columns: CATEGORIES.map((c) => ({ title: c, category: c, limit: 3 })) },
  },
]

export const demoNavigation = (ids: { home: string; history: string; mission: string }): NavInputItem[] => [
  { location: 'header', label: 'Home', pageId: ids.home },
  {
    location: 'header',
    label: 'About',
    children: [
      { label: 'History', pageId: ids.history },
      { label: 'Mission & Vision', pageId: ids.mission },
      { label: 'Faculty & Staff', url: '/staff' },
    ],
  },
  { location: 'header', label: 'News', url: '/news' },
  { location: 'header', label: 'Events', url: '/events' },
  { location: 'header', label: 'Contact', url: '/contact' },
  {
    location: 'footer',
    label: 'For Parents',
    children: [
      { label: 'Downloads', url: '/downloads' },
      { label: 'Events', url: '/events' },
      { label: 'Contact', url: '/contact' },
    ],
  },
  {
    location: 'footer',
    label: 'School',
    children: [
      { label: 'History', pageId: ids.history },
      { label: 'News', url: '/news' },
    ],
  },
]
```

- [ ] **Step 5: Write the seed and removal**

`api/src/demo/seed.ts`:

```ts
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { and, eq } from 'drizzle-orm'
import type { SiteSettings } from '@cms/shared'
import { db } from '../db/client.js'
import { pages, siteSettings, users } from '../db/schema/index.js'
import { AppError } from '../lib/errors.js'
import * as mediaService from '../modules/media/media.service.js'
import * as postsService from '../modules/posts/posts.service.js'
import * as eventsService from '../modules/events/events.service.js'
import * as pagesService from '../modules/pages/pages.service.js'
import * as site from '../modules/site/site.service.js'
import {
  PLACEHOLDER_CAPTION,
  daysAgo,
  demoDownloads,
  demoEvents,
  demoNavigation,
  demoPosts,
  demoSettings,
  demoStaff,
  historyBlocks,
  homeBlocks,
  missionBlocks,
} from './content.js'
import { samplePdf } from './pdf.js'
import { DEMO_PHOTOS, PHOTO_ROLES, photoFile, type PhotoRole } from './photos.js'

export const MANIFEST_KEY = 'demo.manifest'

export interface DemoManifest {
  createdAt: string
  ids: {
    media: string[]
    posts: string[]
    events: string[]
    staff: string[]
    downloads: string[]
    pages: string[]
  }
  /** State the seed overwrites, captured first so removal can put it back. */
  snapshot: {
    home: { id: string; status: 'draft' | 'published'; blocks: Array<{ type: string; data: unknown }> } | null
    navigation: site.NavInputItem[]
    settings: SiteSettings
  }
}

export async function readManifest(): Promise<DemoManifest | null> {
  const row = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, MANIFEST_KEY))
    .limit(1)
    .then((r) => r[0])
  return (row?.value as DemoManifest | undefined) ?? null
}

async function writeManifest(manifest: DemoManifest): Promise<void> {
  // Written directly, not through saveSettings: this key is internal and is
  // deliberately excluded from the public settings object.
  await db
    .insert(siteSettings)
    .values({ key: MANIFEST_KEY, value: manifest })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: manifest } })
}

async function deleteManifest(): Promise<void> {
  await db.delete(siteSettings).where(eq(siteSettings.key, MANIFEST_KEY))
}

async function adminActor() {
  const admin = await db
    .select()
    .from(users)
    .where(and(eq(users.role, 'super_admin'), eq(users.status, 'active')))
    .limit(1)
    .then((r) => r[0])
  if (!admin) throw new Error('No active administrator found. Run `npm run create-admin` first.')
  return { id: admin.id, ip: null }
}

export async function seedDemo(opts: { imagesDir: string }): Promise<DemoManifest['ids']> {
  if (await readManifest()) {
    throw new Error('Demo content is already seeded. Run `npm run seed:demo -- --remove` first.')
  }

  const missing: string[] = []
  for (const role of PHOTO_ROLES) {
    try {
      await access(path.join(opts.imagesDir, photoFile(role)))
    } catch {
      missing.push(photoFile(role))
    }
  }
  if (missing.length) {
    throw new Error(`Missing demo photos in ${opts.imagesDir}: ${missing.join(', ')}`)
  }

  const actor = await adminActor()

  const existingHome = await db
    .select()
    .from(pages)
    .where(eq(pages.slug, 'home'))
    .limit(1)
    .then((r) => r[0])

  const manifest: DemoManifest = {
    createdAt: new Date().toISOString(),
    ids: { media: [], posts: [], events: [], staff: [], downloads: [], pages: [] },
    snapshot: {
      home: existingHome
        ? {
            id: existingHome.id,
            status: existingHome.status,
            blocks: (await pagesService.getWithBlocks(existingHome.id)).blocks.map((b) => ({
              type: b.type,
              data: b.data,
            })),
          }
        : null,
      navigation: await site.exportNavigationTree(),
      settings: await site.getSettings(),
    },
  }

  // Record progress as we go, so a failure half-way through is still fully
  // removable with --remove instead of leaving untracked rows behind.
  const record = async <K extends keyof DemoManifest['ids']>(kind: K, id: string) => {
    manifest.ids[kind].push(id)
    await writeManifest(manifest)
  }
  await writeManifest(manifest)

  // --- photos --------------------------------------------------------------
  const photoIds = {} as Record<PhotoRole, string>
  for (const role of PHOTO_ROLES) {
    const row = await mediaService.upload({
      buffer: await readFile(path.join(opts.imagesDir, photoFile(role))),
      originalName: photoFile(role),
      alt: DEMO_PHOTOS[role].alt,
      caption: PLACEHOLDER_CAPTION,
      actor,
    })
    photoIds[role] = row.id
    await record('media', row.id)
  }

  // --- posts ---------------------------------------------------------------
  for (const item of demoPosts) {
    const post = await postsService.create({ title: item.title, slug: item.slug }, actor)
    await record('posts', post.id)
    await postsService.update(
      post.id,
      {
        excerpt: item.excerpt,
        body: item.body,
        category: item.category,
        coverMediaId: item.cover ? photoIds[item.cover] : null,
      },
      actor,
    )
    await postsService.setStatus(post.id, 'published', daysAgo(item.daysAgo), actor)
  }

  // --- events --------------------------------------------------------------
  for (const item of demoEvents()) {
    const event = await eventsService.create({ title: item.title, slug: item.slug, startsAt: item.startsAt }, actor)
    await record('events', event.id)
    await eventsService.update(
      event.id,
      {
        endsAt: item.endsAt,
        allDay: item.allDay,
        location: item.location,
        description: item.description,
        coverMediaId: item.cover ? photoIds[item.cover] : null,
      },
      actor,
    )
    await eventsService.setStatus(event.id, 'published', actor)
  }

  // --- staff ---------------------------------------------------------------
  for (const [seq, person] of demoStaff.entries()) {
    const row = await site.upsertStaff(
      {
        name: person.name,
        roleTitle: person.roleTitle,
        department: person.department,
        photoMediaId: photoIds[person.photo],
        bio: 'Placeholder profile — replace before launch.',
        seq,
        isPublished: true,
      },
      actor,
    )
    await record('staff', row.id)
  }

  // --- downloads -----------------------------------------------------------
  for (const [seq, item] of demoDownloads.entries()) {
    const file = await mediaService.upload({
      buffer: samplePdf(item.pdfTitle, item.pdfLines),
      originalName: item.file,
      alt: item.alt,
      caption: PLACEHOLDER_CAPTION,
      actor,
    })
    await record('media', file.id)
    const row = await site.upsertDownload(
      {
        title: item.title,
        description: item.description,
        mediaId: file.id,
        category: item.category,
        seq,
        isPublished: true,
      },
      actor,
    )
    await record('downloads', row.id)
  }

  // --- pages ---------------------------------------------------------------
  const history = await pagesService.create({ title: 'Our History', slug: 'history' }, actor)
  await record('pages', history.id)
  await pagesService.saveBlocks(
    history.id,
    historyBlocks({ first: photoIds['history-1'], second: photoIds['history-2'] }),
    actor,
  )
  await pagesService.setStatus(history.id, 'published', null, actor)

  const mission = await pagesService.create({ title: 'Mission and Vision', slug: 'mission-and-vision' }, actor)
  await record('pages', mission.id)
  await pagesService.saveBlocks(mission.id, missionBlocks(), actor)
  await pagesService.setStatus(mission.id, 'published', null, actor)

  let homeId = existingHome?.id
  if (!homeId) {
    const home = await pagesService.create({ title: 'Home', slug: 'home' }, actor)
    homeId = home.id
    await record('pages', home.id)
  }
  await pagesService.saveBlocks(homeId, homeBlocks(photoIds.hero), actor)
  await pagesService.setStatus(homeId, 'published', null, actor)

  // --- settings and navigation ----------------------------------------------
  await site.saveSettings(demoSettings, actor)
  await site.saveNavigation(demoNavigation({ home: homeId, history: history.id, mission: mission.id }), actor)

  return manifest.ids
}

/** Run a deletion, tolerating rows someone already removed by hand. */
async function tolerateMissing(run: () => Promise<unknown>): Promise<void> {
  try {
    await run()
  } catch (err) {
    if (err instanceof AppError && err.status === 404) return
    throw err
  }
}

export async function removeDemo(): Promise<void> {
  const manifest = await readManifest()
  if (!manifest) throw new Error('No demo content to remove.')

  const actor = await adminActor()
  const { ids, snapshot } = manifest

  for (const id of ids.downloads) await site.removeDownload(id, actor)
  for (const id of ids.staff) await site.removeStaff(id, actor)
  for (const id of ids.events) await tolerateMissing(() => eventsService.remove(id, actor))
  for (const id of ids.posts) await tolerateMissing(() => postsService.remove(id, actor))
  for (const id of ids.pages) await tolerateMissing(() => pagesService.remove(id, actor))

  if (snapshot.home) {
    await tolerateMissing(async () => {
      await pagesService.saveBlocks(snapshot.home!.id, snapshot.home!.blocks, actor)
      await pagesService.setStatus(snapshot.home!.id, snapshot.home!.status, null, actor)
    })
  }
  await site.saveNavigation(snapshot.navigation, actor)
  await site.saveSettings(snapshot.settings, actor)

  // Media last: nothing restored above may still reference it.
  for (const id of ids.media) await tolerateMissing(() => mediaService.remove(id, actor))

  await deleteManifest()
}
```

- [ ] **Step 6: Run the tests**

Run: `npm test --workspace=api -- demo`
Expected: 6 passed.

Run: `npm test --workspace=api`
Expected: all pass (25).

- [ ] **Step 7: Add the CLI and scripts**

`api/src/scripts/seed-demo.ts`:

```ts
import path from 'node:path'
import { closeDb } from '../db/client.js'
import { removeDemo, seedDemo } from '../demo/seed.js'

/**
 *   npm run seed:demo                 fill the site with demo content
 *   npm run seed:demo -- --remove     remove exactly that content
 */
const remove = process.argv.includes('--remove')

try {
  if (remove) {
    await removeDemo()
    console.log('Demo content removed; previous homepage, navigation and settings restored.')
  } else {
    const ids = await seedDemo({ imagesDir: path.resolve('data/demo-images') })
    console.log(
      `Demo content created: ${ids.media.length} media, ${ids.posts.length} posts, ` +
        `${ids.events.length} events, ${ids.staff.length} staff, ${ids.downloads.length} downloads, ` +
        `${ids.pages.length} pages.`,
    )
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
} finally {
  closeDb()
}
```

```bash
npm pkg set scripts.seed:demo="tsx src/scripts/seed-demo.ts" --workspace=api
npm pkg set scripts.seed:demo="npm run seed:demo --workspace=api --"
```

- [ ] **Step 8: Seed the dev database for real**

Stop `npm run dev` first (the CLI and the dev server should not write concurrently), then:

Run: `npm run seed:demo`
Expected: `Demo content created: 20 media, 9 posts, 5 events, 6 staff, 2 downloads, 2 pages.` (or `3 pages` if the dev database had no home page).

Run: `npm run seed:demo`
Expected: exit code 1 with `Demo content is already seeded. Run \`npm run seed:demo -- --remove\` first.`

Restart `npm run dev`. Open `http://127.0.0.1:3100/admin/media`.
Expected: 18 photos and 2 PDFs, each captioned `PLACEHOLDER — replace before launch`.

- [ ] **Step 9: Typecheck and commit**

Run: `npm run typecheck --workspace=api`
Expected: no `error TS` lines.

```bash
git add api/src/demo api/src/scripts/seed-demo.ts api/test/demo.test.ts api/package.json package.json
git commit -m "feat(demo): seed:demo with manifest-based exact removal" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Web tasks — shared prerequisites

Tasks 10–13 are verified with `npm run check:render`, which fetches server-rendered HTML and asserts on it. For every run:

1. `npm run seed:demo` has been run (Task 9) and not removed.
2. `npm run dev` is running, and `http://127.0.0.1:3100/` responds.

Assertions target the exact demo content defined in `api/src/demo/content.ts`.

---

### Task 10: Layout shell

**Files:**
- Create: `scripts/render-check.mjs`
- Modify: `package.json` (script `check:render`)
- Create: `web/app/components/site/SiteNav.vue`
- Create: `web/app/components/site/SiteMobileNav.vue`
- Create: `web/app/components/site/SiteFooter.vue`
- Rewrite: `web/app/layouts/default.vue`

**Interfaces:**
- Consumes: `NavItem`, `NavLink`, `useChrome()` from `web/app/composables/useSite.ts` (Task 3).
- Produces: `<SiteNav :items="NavItem[]" />`, `<SiteMobileNav :items="NavItem[]" />`, `<SiteFooter :settings="SiteSettings | undefined" :items="NavItem[]" />`.
- Produces: markers `data-utility-strip`, `data-site-header`, `data-site-footer`; dropdown trigger ids `nav-trigger-{id}`, panel ids `nav-panel-{id}`.
- Produces: `check(path, name, fn)`, `between(html, startMarker, endMarker)`, `count(html, regex)`, `APOS` in `scripts/render-check.mjs`.

- [ ] **Step 1: Write the failing render checks**

`scripts/render-check.mjs`:

```js
#!/usr/bin/env node
/**
 * Render checks for the public site: fetch server-rendered HTML and assert on
 * its structure. Requires `npm run dev` running and `npm run seed:demo` applied.
 *
 *   npm run check:render
 */
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3100'

const cache = new Map()
async function fetchPage(path) {
  if (!cache.has(path)) {
    const res = await fetch(BASE + path)
    cache.set(path, { status: res.status, html: await res.text() })
  }
  return cache.get(path)
}

/** Remove <script> and <style> bodies so their contents are not mistaken for markup. */
const visible = (html) =>
  html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '')

/** The slice of `html` from `start` up to (not including) `end`. Empty if `start` is absent. */
const between = (html, start, end) => {
  const i = html.indexOf(start)
  if (i < 0) return ''
  const j = html.indexOf(end, i + start.length)
  return html.slice(i, j < 0 ? undefined : j)
}

const count = (html, re) => (html.match(new RegExp(re.source, 'g')) ?? []).length

/** Any rendering of an apostrophe: ' &#39; &#x27; ’ */
const APOS = "(?:'|&#39;|&#x27;|’)"

const checks = []
const check = (path, name, fn) => checks.push({ path, name, fn })

// ---- Task 10: layout shell -------------------------------------------------

check('/', 'utility strip shows established year and phone', (h) => {
  const strip = between(h, 'data-utility-strip', 'data-site-header')
  return strip.includes('Established 1990') && strip.includes('(02) 8123 4567')
})

check('/', 'main header bar is maroon', (h) => /data-site-header[^>]*class="[^"]*bg-maroon/.test(h))

check('/', 'About is a dropdown trigger, closed by default', (h) =>
  /<button[^>]*aria-expanded="false"[^>]*aria-controls="nav-panel-[^"]+"[^>]*>\s*About/.test(
    between(h, 'data-site-header', '</header>'),
  ),
)

check('/', 'dropdown links are in the server-rendered header', (h) => {
  const header = between(h, 'data-site-header', '</header>')
  return ['href="/history"', 'href="/mission-and-vision"', 'href="/staff"'].every((a) => header.includes(a))
})

check('/', 'mobile menu toggle is present', (h) =>
  /<button[^>]*aria-controls="mobile-nav"/.test(between(h, 'data-site-header', '</header>')),
)

check('/', 'footer is maroon with nav columns and contact details', (h) => {
  const footer = between(h, 'data-site-footer', '</footer>')
  return (
    /data-site-footer[^>]*class="[^"]*bg-maroon/.test(h) &&
    footer.includes('For Parents') &&
    />\s*School\s*</.test(footer) &&
    footer.includes('(02) 8123 4567') &&
    /&copy;|©/.test(footer)
  )
})

// ---- end of checks — later tasks add sections above this line ---------------

let failed = 0
for (const c of checks) {
  const { status, html } = await fetchPage(c.path)
  let ok = false
  let note = ''
  try {
    ok = status === 200 && Boolean(await c.fn(visible(html)))
  } catch (err) {
    note = ` — ${err.message}`
  }
  if (!ok) failed++
  console.log(`${ok ? '  ok  ' : '  FAIL'}  ${c.path}  ${c.name}${status === 200 ? '' : ` (HTTP ${status})`}${note}`)
}
console.log(failed ? `\n${failed} failure(s).` : '\nAll render checks passed.')
process.exit(failed ? 1 : 0)
```

```bash
npm pkg set scripts.check:render="node scripts/render-check.mjs"
```

- [ ] **Step 2: Run the checks and verify they fail**

Run: `npm run check:render`
Expected: 6 FAIL lines (no utility strip, cream header, flat nav, navy footer).

- [ ] **Step 3: Create the desktop navigation**

`web/app/components/site/SiteNav.vue`:

```vue
<script setup lang="ts">
import type { NavItem } from '~/composables/useSite'

/**
 * Desktop header navigation with one level of dropdowns (disclosure pattern).
 *
 * Panels open on hover AND on click, Enter, Space or ArrowDown: hover-only menus
 * are unusable by keyboard and on touch screens. Links are always present in
 * the server-rendered HTML (v-show, not v-if), so crawlers and visitors without
 * JavaScript still reach every page.
 */
defineProps<{ items: NavItem[] }>()

const route = useRoute()
const root = ref<HTMLElement>()
const openId = ref<string | null>(null)
let openedByHover = false
let closeTimer: ReturnType<typeof setTimeout> | undefined

function open(id: string) {
  clearTimeout(closeTimer)
  openId.value = id
}

function close() {
  clearTimeout(closeTimer)
  openId.value = null
  openedByHover = false
}

// A short delay so moving the pointer from trigger to panel does not snap shut.
function closeSoon() {
  clearTimeout(closeTimer)
  closeTimer = setTimeout(close, 150)
}

function onPointerEnter(item: NavItem) {
  if (!item.children.length) return
  if (openId.value !== item.id) openedByHover = true
  open(item.id)
}

function onTriggerClick(id: string) {
  // A mouse user hovers (opening the panel) and then clicks: keep it open
  // rather than toggling it shut under their pointer.
  if (openId.value === id && openedByHover) {
    openedByHover = false
    return
  }
  if (openId.value === id) close()
  else open(id)
}

const panelLinks = (id: string) =>
  Array.from(root.value?.querySelectorAll<HTMLAnchorElement>(`#nav-panel-${id} a`) ?? [])

async function openAndFocus(id: string, which: 'first' | 'last') {
  open(id)
  await nextTick()
  const links = panelLinks(id)
  ;(which === 'first' ? links[0] : links[links.length - 1])?.focus()
}

function onTriggerKeydown(e: KeyboardEvent, id: string) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    void openAndFocus(id, 'first')
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    void openAndFocus(id, 'last')
  } else if (e.key === 'Escape') {
    close()
  }
}

function onPanelKeydown(e: KeyboardEvent, id: string) {
  const links = panelLinks(id)
  const i = links.indexOf(document.activeElement as HTMLAnchorElement)
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    links[(i + 1) % links.length]?.focus()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    links[(i - 1 + links.length) % links.length]?.focus()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    close()
    root.value?.querySelector<HTMLButtonElement>(`#nav-trigger-${id}`)?.focus()
  }
}

function onFocusOut(e: FocusEvent) {
  if (!root.value?.contains(e.relatedTarget as Node | null)) close()
}

function onDocumentClick(e: MouseEvent) {
  if (!root.value?.contains(e.target as Node)) close()
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  clearTimeout(closeTimer)
})
watch(() => route.fullPath, close)

const matches = (href: string) =>
  href === '/' ? route.path === '/' : route.path === href || route.path.startsWith(`${href}/`)
const isCurrent = (item: NavItem) =>
  item.href ? matches(item.href) : item.children.some((c) => matches(c.href))
</script>

<template>
  <nav ref="root" aria-label="Main" @focusout="onFocusOut">
    <ul class="flex items-center gap-1">
      <li
        v-for="item in items"
        :key="item.id"
        class="relative"
        @mouseenter="onPointerEnter(item)"
        @mouseleave="item.children.length && closeSoon()"
      >
        <template v-if="item.children.length">
          <button
            :id="`nav-trigger-${item.id}`"
            type="button"
            :aria-expanded="openId === item.id"
            :aria-controls="`nav-panel-${item.id}`"
            class="inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors"
            :class="isCurrent(item) ? 'border-gold text-cream' : 'border-transparent text-cream/85 hover:text-cream'"
            @click="onTriggerClick(item.id)"
            @keydown="onTriggerKeydown($event, item.id)"
          >
            {{ item.label }}
            <svg
              class="size-3 transition-transform"
              :class="openId === item.id ? 'rotate-180' : ''"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>

          <ul
            v-show="openId === item.id"
            :id="`nav-panel-${item.id}`"
            class="absolute left-0 top-full z-50 mt-2 min-w-56 rounded-card border-t-2 border-gold bg-white py-2 shadow-lg"
            @keydown="onPanelKeydown($event, item.id)"
          >
            <li v-for="child in item.children" :key="child.id">
              <NuxtLink
                :to="child.href"
                :target="child.opensNewTab ? '_blank' : undefined"
                :rel="child.opensNewTab ? 'noopener' : undefined"
                class="block px-4 py-2 text-sm text-maroon hover:bg-maroon-tint focus:bg-maroon-tint focus:outline-none"
              >
                {{ child.label }}
              </NuxtLink>
            </li>
          </ul>
        </template>

        <NuxtLink
          v-else
          :to="item.href!"
          :target="item.opensNewTab ? '_blank' : undefined"
          :rel="item.opensNewTab ? 'noopener' : undefined"
          class="inline-flex border-b-2 px-3 py-2 text-sm font-medium transition-colors"
          :class="isCurrent(item) ? 'border-gold text-cream' : 'border-transparent text-cream/85 hover:text-cream'"
        >
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
```

- [ ] **Step 4: Create the mobile navigation**

`web/app/components/site/SiteMobileNav.vue`:

```vue
<script setup lang="ts">
import type { NavItem } from '~/composables/useSite'

/**
 * Phone navigation. Parents become expandable rows — there is no hover on a
 * touch screen. The panel positions against the sticky header, so it spans the
 * full width below it.
 */
defineProps<{ items: NavItem[] }>()

const route = useRoute()
const open = ref(false)
const expanded = ref<string | null>(null)

watch(
  () => route.fullPath,
  () => {
    open.value = false
    expanded.value = null
  },
)
</script>

<template>
  <div>
    <button
      type="button"
      class="rounded-card px-3 py-2 text-sm font-semibold text-cream hover:bg-maroon-deep"
      :aria-expanded="open"
      aria-controls="mobile-nav"
      @click="open = !open"
    >
      {{ open ? 'Close' : 'Menu' }}
    </button>

    <nav
      v-show="open"
      id="mobile-nav"
      aria-label="Main"
      class="absolute inset-x-0 top-full border-t border-cream/10 bg-maroon-deep shadow-lg"
    >
      <ul class="mx-auto max-w-6xl px-5 py-3">
        <li v-for="item in items" :key="item.id" class="border-b border-cream/10 last:border-0">
          <template v-if="item.children.length">
            <button
              type="button"
              class="flex w-full items-center justify-between py-3 text-left text-base font-medium text-cream"
              :aria-expanded="expanded === item.id"
              :aria-controls="`mobile-sub-${item.id}`"
              @click="expanded = expanded === item.id ? null : item.id"
            >
              {{ item.label }}
              <span aria-hidden="true" class="text-gold-light">{{ expanded === item.id ? '−' : '+' }}</span>
            </button>
            <ul v-show="expanded === item.id" :id="`mobile-sub-${item.id}`" class="mb-3 border-l-2 border-gold pl-4">
              <li v-for="child in item.children" :key="child.id">
                <NuxtLink
                  :to="child.href"
                  :target="child.opensNewTab ? '_blank' : undefined"
                  class="block py-2 text-sm text-cream/85 hover:text-cream"
                >
                  {{ child.label }}
                </NuxtLink>
              </li>
            </ul>
          </template>
          <NuxtLink
            v-else
            :to="item.href!"
            :target="item.opensNewTab ? '_blank' : undefined"
            class="block py-3 text-base font-medium text-cream"
          >
            {{ item.label }}
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
```

- [ ] **Step 5: Create the footer**

`web/app/components/site/SiteFooter.vue`:

```vue
<script setup lang="ts">
import type { SiteSettings } from '@cms/shared'
import type { NavItem, NavLink } from '~/composables/useSite'

const props = defineProps<{ settings: SiteSettings | undefined; items: NavItem[] }>()

/**
 * A footer item with children becomes a column; childless items are gathered
 * into a final "Links" column. The office builds these in the Navigation screen.
 */
const columns = computed(() => {
  const cols: Array<{ id: string; title: string; links: NavLink[] }> = props.items
    .filter((i) => i.children.length)
    .map((i) => ({ id: i.id, title: i.label, links: i.children }))

  const loose = props.items
    .filter((i) => !i.children.length && i.href)
    .map((i) => ({ id: i.id, label: i.label, href: i.href!, opensNewTab: i.opensNewTab }))
  if (loose.length) cols.push({ id: 'links', title: 'Links', links: loose })

  return cols
})

const year = new Date().getFullYear()
</script>

<template>
  <footer data-site-footer class="border-t-4 border-gold bg-maroon text-cream/85">
    <div class="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <p class="font-display text-xl font-semibold text-cream">{{ settings?.['site.name'] }}</p>
        <p v-if="settings?.['site.tagline']" class="mt-2 text-sm text-gold-light">{{ settings['site.tagline'] }}</p>
        <p v-if="settings?.['site.foundedYear']" class="mt-4 text-xs text-cream/70">
          Established {{ settings['site.foundedYear'] }}
        </p>
        <p v-if="settings?.['contact.address']" class="mt-4 whitespace-pre-line text-sm">
          {{ settings['contact.address'] }}
        </p>
      </div>

      <div v-for="col in columns" :key="col.id">
        <h2 class="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-light">{{ col.title }}</h2>
        <ul class="mt-4 space-y-2 text-sm">
          <li v-for="link in col.links" :key="link.id">
            <NuxtLink
              :to="link.href"
              :target="link.opensNewTab ? '_blank' : undefined"
              class="hover:text-cream hover:underline"
            >
              {{ link.label }}
            </NuxtLink>
          </li>
        </ul>
      </div>

      <div v-if="settings?.['contact.phone'] || settings?.['contact.email'] || settings?.['social.facebook']">
        <h2 class="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-light">Contact</h2>
        <ul class="mt-4 space-y-2 text-sm">
          <li v-if="settings['contact.phone']">
            <a :href="`tel:${settings['contact.phone']}`" class="hover:text-cream">{{ settings['contact.phone'] }}</a>
          </li>
          <li v-if="settings['contact.email']">
            <a :href="`mailto:${settings['contact.email']}`" class="hover:text-cream">{{ settings['contact.email'] }}</a>
          </li>
          <li v-if="settings['social.facebook']">
            <a :href="settings['social.facebook']" target="_blank" rel="noopener" class="text-gold-light hover:text-cream">
              Facebook
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div class="border-t border-cream/10 px-5 py-5">
      <p class="mx-auto max-w-6xl text-xs text-cream/70">&copy; {{ year }} {{ settings?.['site.name'] }}</p>
    </div>
  </footer>
</template>
```

- [ ] **Step 6: Rewrite the layout**

Replace `web/app/layouts/default.vue`:

```vue
<script setup lang="ts">
const { data: chrome } = await useChrome()

const settings = computed(() => chrome.value?.settings)
const headerNav = computed(() => chrome.value?.nav.header ?? [])
const footerNav = computed(() => chrome.value?.nav.footer ?? [])

// Canonical on every public page, and the School schema once, from the layout —
// so a new page cannot be added without them.
useCanonical()
useSchoolSchema(settings)

useSeoMeta({
  titleTemplate: (title) =>
    title && title !== settings.value?.['site.name']
      ? `${title} — ${settings.value?.['site.name'] ?? 'Cherished Moments School'}`
      : (settings.value?.['site.name'] ?? 'Cherished Moments School'),
  ogSiteName: () => settings.value?.['site.name'],
  ogType: 'website',
  ogLocale: 'en',
})
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <a class="skip-link" href="#main">Skip to main content</a>

    <!-- Announcements stay first: an urgent notice must be seen before anything else. -->
    <div
      v-for="a in chrome?.announcements ?? []"
      :key="a.id"
      class="bg-gold-ink px-4 py-2 text-center text-sm font-medium text-cream"
    >
      {{ a.title }}
    </div>

    <div data-utility-strip class="hidden bg-maroon-deep text-cream/85 md:block">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-2 text-xs">
        <p>
          Established {{ settings?.['site.foundedYear'] }}
          <template v-if="settings?.['site.tagline']"> · {{ settings['site.tagline'] }}</template>
        </p>
        <ul class="flex items-center gap-5">
          <li v-if="settings?.['contact.phone']">
            <a :href="`tel:${settings['contact.phone']}`" class="hover:text-cream">{{ settings['contact.phone'] }}</a>
          </li>
          <li v-if="settings?.['contact.email']">
            <a :href="`mailto:${settings['contact.email']}`" class="hover:text-cream">{{ settings['contact.email'] }}</a>
          </li>
          <li v-if="settings?.['social.facebook']">
            <a :href="settings['social.facebook']" target="_blank" rel="noopener" class="text-gold-light hover:text-cream">
              Facebook
            </a>
          </li>
        </ul>
      </div>
    </div>

    <header data-site-header class="sticky top-0 z-40 bg-maroon shadow-[0_1px_0_rgb(0_0_0/0.2)]">
      <div class="mx-auto flex max-w-6xl items-center gap-6 px-5 py-4">
        <!--
          Wordmark for now. This is the slot for the simplified crest mark once
          the vector source arrives — docs/design-system.md §5.
        -->
        <NuxtLink to="/" class="flex min-w-0 flex-col leading-none">
          <span class="truncate font-display text-xl font-semibold text-cream sm:text-2xl">
            {{ settings?.['site.name'] ?? 'Cherished Moments School' }}
          </span>
          <span
            v-if="settings?.['site.tagline']"
            class="mt-1.5 hidden truncate text-[10px] font-bold uppercase tracking-[0.16em] text-gold-light sm:block"
          >
            {{ settings['site.tagline'] }}
          </span>
        </NuxtLink>

        <SiteNav :items="headerNav" class="ml-auto hidden md:block" />
        <SiteMobileNav :items="headerNav" class="ml-auto md:hidden" />
      </div>
    </header>

    <main id="main" class="flex-1">
      <slot />
    </main>

    <SiteFooter :settings="settings" :items="footerNav" />
  </div>
</template>
```

- [ ] **Step 7: Run the render checks**

Run: `npm run check:render`
Expected: `All render checks passed.` (6 ok lines).

- [ ] **Step 8: Check the dropdown by keyboard in a real browser**

Open `http://127.0.0.1:3100/` at a desktop width. Press Tab until **About** is focused, then:
1. Enter — panel opens; `aria-expanded` becomes `true` (inspect the element).
2. ArrowDown — focus moves to **History**.
3. ArrowDown twice — focus reaches **Faculty & Staff**; once more wraps to **History**.
4. Escape — panel closes and focus returns to **About**.
5. Enter, then Tab past the last link — the panel closes.
6. Hover **About**, then click it — the panel stays open.

Expected: all six behave as described. Record any failure and fix it before committing.

- [ ] **Step 9: Typecheck and commit**

Run: `npm run typecheck --workspace=web`
Expected: no `error TS` lines.

```bash
git add scripts/render-check.mjs package.json web/app/components/site web/app/layouts/default.vue
git commit -m "feat(web): two-tier maroon header with dropdowns, maroon footer" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Shared components and page header band

**Files:**
- Create: `web/app/types/content.ts`
- Create: `web/app/utils/dates.ts`
- Modify: `web/app/assets/css/main.css`
- Create: `web/app/components/SectionHeading.vue`
- Create: `web/app/components/DateBadge.vue`
- Create: `web/app/components/NewsCard.vue`
- Create: `web/app/components/Breadcrumbs.vue`
- Rewrite: `web/app/components/PageHeader.vue`
- Modify: `web/app/pages/[...slug].vue`
- Modify: `scripts/render-check.mjs`

**Interfaces:**
- Produces (`types/content.ts`): `PostSummary`, `EventItem`, `StoriesColumn` (shapes below).
- Produces (auto-imported utils): `formatLongDate(iso)`, `formatMonthYear(iso)`, `formatMonthShort(iso)`, `formatDay(iso)`, `eventWhen({ startsAt, endsAt, allDay })` — all in `Asia/Manila`.
- Produces CSS classes: `btn-maroon`, `btn-outline`, `btn-gold`, `btn-ghost-light`, `chip`, `chip-active`.
- Produces components:
  - `<SectionHeading title :level?="2|3" :link?="{ label, href }" />`
  - `<DateBadge :date="iso" size?="md|lg" tone?="light|dark" />` — root has `data-date-badge`
  - `<NewsCard :post="PostSummary" variant?="large|standard|compact" :heading-level?="2|3|4" />` — root has `data-news-card="{variant}"`
  - `<Breadcrumbs :items="Array<{ label, to? }>" />`
  - `<PageHeader title intro? eyebrow? :breadcrumbs? />` with a default slot; root has `data-page-header`

- [ ] **Step 1: Add the failing render checks**

In `scripts/render-check.mjs`, insert above the `// ---- end of checks` line:

```js
// ---- Task 11: page header band -------------------------------------------

check('/history', 'CMS page without a hero gets the maroon title band', (h) =>
  /data-page-header[^>]*class="[^"]*bg-maroon/.test(h) && /<h1[^>]*>\s*Our History\s*<\/h1>/.test(h),
)

check('/history', 'band carries a breadcrumb ending at the current page', (h) => {
  const band = between(h, 'data-page-header', '</header>')
  return (
    band.includes('aria-label="Breadcrumb"') &&
    band.includes('href="/"') &&
    /aria-current="page"[^>]*>\s*Our History/.test(band)
  )
})

check('/', 'homepage (hero first) has no title band', (h) => !h.includes('data-page-header'))
```

- [ ] **Step 2: Run the checks and verify the new ones fail**

Run: `npm run check:render`
Expected: the first two Task 11 checks FAIL. The homepage check passes already, which confirms the rule is not double-applied.

- [ ] **Step 3: Add types and date formatting**

`web/app/types/content.ts`:

```ts
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
```

`web/app/utils/dates.ts`:

```ts
/**
 * Every date on the public site is formatted in Manila time. Formatting in the
 * runtime's local zone would render one value on the server and a different
 * one in a visitor's browser, which Vue reports as a hydration mismatch.
 */
const TZ = 'Asia/Manila'
const LOCALE = 'en-PH'

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: TZ })

const longDate = fmt({ day: 'numeric', month: 'long', year: 'numeric' })
const monthYear = fmt({ month: 'long', year: 'numeric' })
const monthShort = fmt({ month: 'short' })
const day = fmt({ day: 'numeric' })
const time = fmt({ hour: 'numeric', minute: '2-digit' })

export const formatLongDate = (iso: string) => longDate.format(new Date(iso))
export const formatMonthYear = (iso: string) => monthYear.format(new Date(iso))
export const formatMonthShort = (iso: string) => monthShort.format(new Date(iso))
export const formatDay = (iso: string) => day.format(new Date(iso))

export function eventWhen(e: { startsAt: string; endsAt: string | null; allDay: boolean }): string {
  if (e.allDay) return 'All day'
  const start = time.format(new Date(e.startsAt))
  return e.endsAt ? `${start} – ${time.format(new Date(e.endsAt))}` : start
}
```

- [ ] **Step 4: Add button and chip classes**

Append to the end of `web/app/assets/css/main.css`:

```css
@layer components {
  .btn-maroon,
  .btn-outline,
  .btn-gold,
  .btn-ghost-light {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--text-sm);
    font-weight: 600;
    transition:
      background-color 0.15s,
      color 0.15s,
      border-color 0.15s;
  }

  .btn-maroon {
    border-radius: var(--radius-card);
    background: var(--color-maroon);
    color: var(--color-cream);
    padding: 0.625rem 1.25rem;
  }
  .btn-maroon:hover {
    background: var(--color-maroon-deep);
  }

  .btn-outline {
    border-radius: var(--radius-card);
    border: 1px solid var(--color-maroon);
    color: var(--color-maroon);
    padding: 0.5rem 1.125rem;
  }
  .btn-outline:hover {
    background: var(--color-maroon-tint);
  }

  /* Hero primary action: gold-light with maroon-deep text measures 7.9:1. */
  .btn-gold {
    border-radius: 9999px;
    background: var(--color-gold-light);
    color: var(--color-maroon-deep);
    padding: 0.75rem 1.5rem;
  }
  .btn-gold:hover {
    background: var(--color-cream);
  }

  .btn-ghost-light {
    border-radius: 9999px;
    border: 1px solid rgb(250 247 242 / 0.55);
    color: var(--color-cream);
    padding: 0.75rem 1.5rem;
  }
  .btn-ghost-light:hover {
    background: rgb(250 247 242 / 0.12);
  }

  .chip {
    display: inline-flex;
    border-radius: 9999px;
    border: 1px solid var(--color-hairline);
    background: #fff;
    padding: 0.375rem 0.875rem;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-ink-muted);
  }
  .chip:hover {
    border-color: var(--color-maroon);
    color: var(--color-maroon);
  }
  .chip-active,
  .chip-active:hover {
    border-color: var(--color-maroon);
    background: var(--color-maroon);
    color: var(--color-cream);
  }
}
```

- [ ] **Step 5: Create the presentational components**

`web/app/components/SectionHeading.vue`:

```vue
<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    level?: 2 | 3
    link?: { label: string; href: string }
  }>(),
  { level: 2 },
)
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
    <div>
      <component
        :is="`h${level}`"
        class="font-display font-semibold text-maroon"
        :class="level === 2 ? 'text-3xl' : 'text-2xl'"
      >
        {{ title }}
      </component>
      <div class="mt-3 h-0.5 w-11 bg-gold" />
    </div>
    <NuxtLink
      v-if="link"
      :to="link.href"
      class="text-sm font-semibold text-gold-ink underline underline-offset-4 hover:text-maroon"
    >
      {{ link.label }}
    </NuxtLink>
  </div>
</template>
```

`web/app/components/DateBadge.vue`:

```vue
<script setup lang="ts">
/** Month over day — the visual anchor parents scan a calendar for. */
withDefaults(defineProps<{ date: string; size?: 'md' | 'lg'; tone?: 'light' | 'dark' }>(), {
  size: 'md',
  tone: 'light',
})
</script>

<template>
  <time
    :datetime="date"
    data-date-badge
    class="flex shrink-0 flex-col items-center leading-none"
    :class="size === 'lg' ? 'w-24' : 'w-14'"
  >
    <span
      class="font-bold uppercase tracking-[0.14em]"
      :class="[size === 'lg' ? 'text-sm' : 'text-[11px]', tone === 'dark' ? 'text-gold-light' : 'text-gold-ink']"
    >
      {{ formatMonthShort(date) }}
    </span>
    <span
      class="mt-1 font-display font-semibold"
      :class="[size === 'lg' ? 'text-6xl' : 'text-3xl', tone === 'dark' ? 'text-cream' : 'text-maroon']"
    >
      {{ formatDay(date) }}
    </span>
  </time>
</template>
```

`web/app/components/NewsCard.vue`:

```vue
<script setup lang="ts">
import type { PostSummary } from '~/types/content'

const props = withDefaults(
  defineProps<{
    post: PostSummary
    variant?: 'large' | 'standard' | 'compact'
    /** Chosen by the parent so the page's heading outline never skips a level. */
    headingLevel?: 2 | 3 | 4
  }>(),
  { variant: 'standard', headingLevel: 3 },
)

const href = computed(() => `/news/${props.post.slug}`)
const tag = computed(() => `h${props.headingLevel}`)
const src = (minWidth: number) =>
  props.post.cover
    ? (props.post.cover.srcset.find((s) => s.width >= minWidth)?.url ?? props.post.cover.url)
    : undefined
const ratio = computed(() => (props.variant === 'large' ? 'aspect-[16/9]' : 'aspect-[3/2]'))
</script>

<template>
  <article v-if="variant === 'compact'" data-news-card="compact" class="group">
    <NuxtLink :to="href" class="flex gap-4">
      <img
        v-if="post.cover"
        :src="src(400)"
        :alt="post.cover.alt"
        :width="post.cover.width ?? undefined"
        :height="post.cover.height ?? undefined"
        loading="lazy"
        class="size-20 shrink-0 rounded-card object-cover"
      />
      <div v-else class="size-20 shrink-0 rounded-card bg-maroon-tint" aria-hidden="true" />
      <div class="min-w-0">
        <component
          :is="tag"
          class="font-display text-base font-semibold leading-snug text-maroon underline-offset-4 group-hover:underline"
        >
          {{ post.title }}
        </component>
        <p class="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-muted">{{ post.excerpt }}</p>
      </div>
    </NuxtLink>
  </article>

  <article v-else :data-news-card="variant" class="group">
    <NuxtLink :to="href" class="block">
      <img
        v-if="post.cover"
        :src="src(variant === 'large' ? 1200 : 800)"
        :srcset="srcsetFor(post.cover)"
        :sizes="variant === 'large' ? '(min-width: 1024px) 44rem, 92vw' : '(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 92vw'"
        :alt="post.cover.alt"
        :width="post.cover.width ?? undefined"
        :height="post.cover.height ?? undefined"
        :loading="variant === 'large' ? 'eager' : 'lazy'"
        :class="ratio"
        class="w-full rounded-card object-cover"
      />
      <div v-else :class="ratio" class="w-full rounded-card bg-maroon-tint" aria-hidden="true" />

      <p class="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-gold-ink">
        <span v-if="post.category">{{ post.category }} &middot; </span>
        <time :datetime="post.publishedAt">{{ formatLongDate(post.publishedAt) }}</time>
      </p>
      <component
        :is="tag"
        class="mt-2 text-balance font-display font-semibold leading-snug text-maroon underline-offset-4 group-hover:underline"
        :class="variant === 'large' ? 'text-3xl' : 'text-xl'"
      >
        {{ post.title }}
      </component>
      <p class="mt-2 line-clamp-3 leading-relaxed text-ink-muted" :class="variant === 'large' ? 'text-lg' : ''">
        {{ post.excerpt }}
      </p>
    </NuxtLink>
  </article>
</template>
```

`web/app/components/Breadcrumbs.vue`:

```vue
<script setup lang="ts">
defineProps<{ items: Array<{ label: string; to?: string }> }>()
</script>

<template>
  <nav aria-label="Breadcrumb">
    <ol class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-cream/80">
      <li v-for="(item, i) in items" :key="i" class="flex items-center gap-2">
        <span v-if="i > 0" aria-hidden="true" class="text-gold-light">›</span>
        <NuxtLink
          v-if="item.to && i < items.length - 1"
          :to="item.to"
          class="underline-offset-4 hover:text-cream hover:underline"
        >
          {{ item.label }}
        </NuxtLink>
        <span v-else aria-current="page" class="text-cream">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>
```

Replace `web/app/components/PageHeader.vue`:

```vue
<script setup lang="ts">
/**
 * The maroon title band every non-hero page opens with. One component, so the
 * band cannot drift between pages.
 */
defineProps<{
  title: string
  intro?: string
  eyebrow?: string
  breadcrumbs?: Array<{ label: string; to?: string }>
}>()
</script>

<template>
  <header data-page-header class="bg-maroon">
    <div class="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <Breadcrumbs v-if="breadcrumbs?.length" :items="breadcrumbs" />
      <p
        v-if="eyebrow"
        class="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-light"
        :class="breadcrumbs?.length ? 'mt-6' : ''"
      >
        {{ eyebrow }}
      </p>
      <h1
        class="text-balance font-display text-4xl font-semibold leading-tight text-cream sm:text-5xl"
        :class="eyebrow ? 'mt-2' : breadcrumbs?.length ? 'mt-6' : ''"
      >
        {{ title }}
      </h1>
      <!-- The gold rule from the crest's tree: once per page, under the title. -->
      <div class="mt-5 h-0.5 w-11 bg-gold" />
      <p v-if="intro" class="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-cream/90">{{ intro }}</p>
      <slot />
    </div>
  </header>
</template>
```

- [ ] **Step 6: Give CMS pages a title band when they don't start with a hero**

In `web/app/pages/[...slug].vue`, replace the `<template>` block:

```vue
<template>
  <div v-if="data">
    <!-- Pages that do not open with a Hero get a title automatically, so an
         editor cannot publish a page with no heading. -->
    <PageHeader
      v-if="data.blocks[0]?.type !== 'hero'"
      :title="data.page.title"
      :breadcrumbs="[{ label: 'Home', to: '/' }, { label: data.page.title }]"
    />
    <BlockRenderer :blocks="data.blocks" :media="data.media" :refs="data.refs" />
  </div>
</template>
```

- [ ] **Step 7: Run the render checks**

Run: `npm run check:render`
Expected: `All render checks passed.` (9 ok lines).

- [ ] **Step 8: Typecheck and commit**

Run: `npm run typecheck --workspace=web`
Expected: no `error TS` lines.

```bash
git add web/app/types web/app/utils web/app/assets/css/main.css web/app/components/SectionHeading.vue web/app/components/DateBadge.vue web/app/components/NewsCard.vue web/app/components/Breadcrumbs.vue web/app/components/PageHeader.vue "web/app/pages/[...slug].vue" scripts/render-check.mjs
git commit -m "feat(web): shared cards, date badge, breadcrumbs and maroon page band" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Homepage blocks

**Files:**
- Rewrite: `web/app/components/blocks/BlockHero.vue`
- Rewrite: `web/app/components/blocks/BlockNewsTeaser.vue`
- Rewrite: `web/app/components/blocks/BlockEventsTeaser.vue`
- Create: `web/app/components/blocks/BlockStoriesColumns.vue`
- Modify: `web/app/components/BlockRenderer.vue`
- Modify: `scripts/render-check.mjs`

**Interfaces:**
- Consumes: `NewsCard`, `DateBadge`, `SectionHeading`, `eventWhen`, `PostSummary`, `EventItem`, `StoriesColumn` (Task 11); resolved `refs` (Tasks 5, 7).
- Produces: root markers `data-block="{type}"` followed by `data-layout="{layout}"` on news and events blocks; `data-stories-column` on each column.

- [ ] **Step 1: Add the failing render checks**

Insert above `// ---- end of checks`:

```js
// ---- Task 12: homepage blocks ----------------------------------------------

check('/', 'hero uses the gold pill for its primary button', (h) =>
  /class="[^"]*btn-gold[^"]*"[^>]*>\s*Enrol for 2026/.test(between(h, 'data-block="hero"', '</section>')),
)

check('/', 'news block uses the featured layout: one large, two standard', (h) => {
  const s = between(h, 'data-block="newsTeaser"', 'data-block="eventsTeaser"')
  return (
    s.startsWith('data-block="newsTeaser" data-layout="featured"') &&
    count(s, /data-news-card="large"/) === 1 &&
    count(s, /data-news-card="standard"/) === 2 &&
    s.includes('href="/news"')
  )
})

check('/', 'events block uses the featured layout with date badges', (h) => {
  const s = between(h, 'data-block="eventsTeaser"', 'data-block="storiesColumns"')
  return (
    s.startsWith('data-block="eventsTeaser" data-layout="featured"') &&
    count(s, /data-date-badge/) >= 4 &&
    s.includes('Foundation Day') &&
    s.includes('href="/events"')
  )
})

check('/', 'stories columns show three categories with compact cards', (h) => {
  const s = between(h, 'data-block="storiesColumns"', 'data-site-footer')
  return (
    count(s, /data-stories-column/) === 3 &&
    new RegExp(`Principal${APOS}s Corner`).test(s) &&
    s.includes('Student Life') &&
    s.includes('Community') &&
    count(s, /data-news-card="compact"/) >= 6 &&
    // vue-router may encode the space in a query value as %20 or as +.
    /href="\/news\?category=Student(?:%20|\+)Life"/.test(s)
  )
})
```

- [ ] **Step 2: Run the checks and verify the new ones fail**

Run: `npm run check:render`
Expected: the four Task 12 checks FAIL; earlier checks still pass.

- [ ] **Step 3: Restyle the hero**

Replace `web/app/components/blocks/BlockHero.vue`:

```vue
<script setup lang="ts">
import type { MediaItem } from '~/composables/useMedia'

const props = defineProps<{
  data: { title: string; subtitle?: string; imageMediaId: string | null; ctas: Array<{ label: string; href: string }> }
  media: MediaItem[]
}>()

const image = computed(() =>
  props.data.imageMediaId ? props.media.find((m) => m.id === props.data.imageMediaId) : undefined,
)
</script>

<template>
  <section
    data-block="hero"
    class="relative isolate flex min-h-[28rem] items-center overflow-hidden md:min-h-[70vh]"
    :class="image ? 'bg-navy-deep' : 'bg-maroon'"
  >
    <template v-if="image">
      <img
        :src="image.srcset.at(-1)?.url ?? image.url"
        :srcset="srcsetFor(image)"
        sizes="100vw"
        :alt="image.alt"
        :width="image.width ?? undefined"
        :height="image.height ?? undefined"
        fetchpriority="high"
        class="absolute inset-0 -z-10 size-full object-cover"
      />
      <!--
        A flat scrim, not a gradient: text must clear WCAG AA against whatever
        photo is uploaded. A lighter top edge failed for the subtitle over a
        bright sky.
      -->
      <div class="absolute inset-0 -z-10 bg-navy-deep/70" />
    </template>

    <div class="mx-auto w-full max-w-4xl px-6 py-20 text-center">
      <h1 class="text-balance font-display text-4xl font-semibold leading-[1.08] text-cream sm:text-5xl lg:text-6xl">
        {{ data.title }}
      </h1>
      <div class="mx-auto mt-6 h-0.5 w-12 bg-gold" />
      <p v-if="data.subtitle" class="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-cream/90 sm:text-xl">
        {{ data.subtitle }}
      </p>

      <div v-if="data.ctas.length" class="mt-9 flex flex-wrap justify-center gap-3">
        <NuxtLink
          v-for="(cta, i) in data.ctas"
          :key="i"
          :to="cta.href"
          :class="i === 0 ? 'btn-gold' : 'btn-ghost-light'"
        >
          {{ cta.label }}
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 4: News block with the featured layout**

Replace `web/app/components/blocks/BlockNewsTeaser.vue`:

```vue
<script setup lang="ts">
import type { PostSummary } from '~/types/content'

// `refs` is resolved server-side by the page endpoint, so this renders during
// SSR with no client fetch — see api/src/modules/pages/references.ts.
const props = defineProps<{
  data: { heading?: string; category?: string | null; layout?: 'featured' | 'grid' }
  refs?: PostSummary[]
}>()

const posts = computed(() => props.refs ?? [])
// Blocks saved before layouts existed have no value and keep the grid.
const layout = computed(() => props.data.layout ?? 'grid')
const moreHref = computed(() =>
  props.data.category ? `/news?category=${encodeURIComponent(props.data.category)}` : '/news',
)
</script>

<template>
  <section v-if="posts.length" data-block="newsTeaser" :data-layout="layout" class="mx-auto max-w-6xl px-5 py-14 sm:py-16">
    <SectionHeading v-if="data.heading" :title="data.heading" />

    <!-- Featured: one large story beside two stacked; degrades for 1 or 2. -->
    <div v-if="layout === 'featured'" class="grid gap-8" :class="[data.heading ? 'mt-8' : '', posts.length >= 3 ? 'lg:grid-cols-3' : posts.length === 2 ? 'md:grid-cols-2' : '']">
      <NewsCard
        :post="posts[0]!"
        :variant="posts.length === 2 ? 'standard' : 'large'"
        :heading-level="data.heading ? 3 : 2"
        :class="posts.length >= 3 ? 'lg:col-span-2' : ''"
      />
      <div v-if="posts.length >= 3" class="grid content-start gap-8 sm:grid-cols-2 lg:grid-cols-1">
        <NewsCard v-for="p in posts.slice(1, 3)" :key="p.id" :post="p" :heading-level="data.heading ? 3 : 2" />
      </div>
      <NewsCard v-else-if="posts.length === 2" :post="posts[1]!" :heading-level="data.heading ? 3 : 2" />
    </div>

    <ul v-else class="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3" :class="data.heading ? 'mt-8' : ''">
      <li v-for="p in posts" :key="p.id">
        <NewsCard :post="p" :heading-level="data.heading ? 3 : 2" />
      </li>
    </ul>

    <div class="mt-10 flex justify-end">
      <NuxtLink :to="moreHref" class="btn-maroon">See more news</NuxtLink>
    </div>
  </section>
</template>
```

- [ ] **Step 5: Events block with the featured layout**

Replace `web/app/components/blocks/BlockEventsTeaser.vue`:

```vue
<script setup lang="ts">
import type { EventItem } from '~/types/content'

const props = defineProps<{
  data: { heading?: string; layout?: 'featured' | 'list' }
  refs?: EventItem[]
}>()

const events = computed(() => props.refs ?? [])
const layout = computed(() => props.data.layout ?? 'list')
const featured = computed(() => events.value[0])
const rest = computed(() => events.value.slice(1))
const titleTag = computed(() => (props.data.heading ? 'h3' : 'h2'))
</script>

<template>
  <section v-if="events.length" data-block="eventsTeaser" :data-layout="layout" class="border-y border-hairline bg-white py-14 sm:py-16">
    <div class="mx-auto max-w-6xl px-5">
      <SectionHeading v-if="data.heading" :title="data.heading" />

      <div v-if="layout === 'featured' && featured" class="grid gap-8 lg:grid-cols-5" :class="data.heading ? 'mt-8' : ''">
        <article class="overflow-hidden rounded-card border border-hairline bg-cream" :class="rest.length ? 'lg:col-span-3' : 'lg:col-span-5'">
          <div class="relative aspect-[16/9] bg-maroon">
            <img
              v-if="featured.cover"
              :src="featured.cover.srcset.find((s) => s.width >= 1200)?.url ?? featured.cover.url"
              :srcset="srcsetFor(featured.cover)"
              sizes="(min-width: 1024px) 40rem, 92vw"
              :alt="featured.cover.alt"
              :width="featured.cover.width ?? undefined"
              :height="featured.cover.height ?? undefined"
              loading="lazy"
              class="size-full object-cover"
            />
            <!-- No picture: the date itself becomes the image, never an empty box. -->
            <div v-else class="grid size-full place-items-center">
              <DateBadge :date="featured.startsAt" size="lg" tone="dark" />
            </div>
          </div>
          <div class="flex gap-5 p-6">
            <DateBadge v-if="featured.cover" :date="featured.startsAt" />
            <div class="min-w-0 self-center">
              <component :is="titleTag" class="font-display text-2xl font-semibold leading-snug text-maroon">
                {{ featured.title }}
              </component>
              <p class="mt-2 text-sm text-ink-muted">
                {{ eventWhen(featured) }}<template v-if="featured.location"> &middot; {{ featured.location }}</template>
              </p>
            </div>
          </div>
        </article>

        <ul v-if="rest.length" class="divide-y divide-hairline lg:col-span-2">
          <li v-for="e in rest" :key="e.id" class="flex gap-5 py-5 first:pt-0">
            <DateBadge :date="e.startsAt" />
            <div class="min-w-0 self-center">
              <component :is="titleTag" class="font-display text-lg font-semibold leading-snug text-maroon">
                {{ e.title }}
              </component>
              <p class="mt-1 text-sm text-ink-muted">
                {{ eventWhen(e) }}<template v-if="e.location"> &middot; {{ e.location }}</template>
              </p>
            </div>
          </li>
        </ul>
      </div>

      <ul v-else class="space-y-3" :class="data.heading ? 'mt-8' : ''">
        <li v-for="e in events" :key="e.id" class="flex items-center gap-5 rounded-card border border-hairline bg-cream p-4">
          <DateBadge :date="e.startsAt" />
          <div class="min-w-0">
            <component :is="titleTag" class="font-medium text-ink">{{ e.title }}</component>
            <p v-if="e.location" class="mt-0.5 text-sm text-ink-muted">{{ e.location }}</p>
          </div>
        </li>
      </ul>

      <div class="mt-10 flex justify-end">
        <NuxtLink to="/events" class="btn-maroon">Full calendar</NuxtLink>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 6: Stories columns block**

`web/app/components/blocks/BlockStoriesColumns.vue`:

```vue
<script setup lang="ts">
import type { StoriesColumn } from '~/types/content'

const props = defineProps<{ data: { heading?: string }; refs?: StoriesColumn[] }>()

const columns = computed(() => props.refs ?? [])
const anyPosts = computed(() => columns.value.some((c) => c.posts.length))
// Keep the outline unbroken: with a block heading the column titles drop a level.
const columnLevel = computed(() => (props.data.heading ? 3 : 2))
const cardLevel = computed(() => (props.data.heading ? 4 : 3))
const gridCols = computed(() =>
  columns.value.length === 3 ? 'lg:grid-cols-3' : columns.value.length === 2 ? 'md:grid-cols-2' : '',
)
</script>

<template>
  <section v-if="anyPosts" data-block="storiesColumns" class="mx-auto max-w-6xl px-5 py-14 sm:py-16">
    <SectionHeading v-if="data.heading" :title="data.heading" />

    <div class="grid gap-12" :class="[gridCols, data.heading ? 'mt-10' : '']">
      <div v-for="col in columns" :key="col.category" data-stories-column class="flex flex-col">
        <SectionHeading :title="col.title" :level="columnLevel" />

        <ul v-if="col.posts.length" class="mt-6 space-y-5">
          <li v-for="p in col.posts" :key="p.id">
            <NewsCard :post="p" variant="compact" :heading-level="cardLevel" />
          </li>
        </ul>
        <p v-else class="mt-6 text-sm text-ink-muted">Nothing here yet.</p>

        <div class="mt-auto pt-6">
          <NuxtLink :to="`/news?category=${encodeURIComponent(col.category)}`" class="btn-outline">
            See more<span class="sr-only"> from {{ col.title }}</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 7: Register the block renderer**

In `web/app/components/BlockRenderer.vue`, add the import beside the other block imports:

```ts
import BlockStoriesColumns from '~/components/blocks/BlockStoriesColumns.vue'
```

and add the entry as the last line of `COMPONENTS`:

```ts
  storiesColumns: BlockStoriesColumns,
```

- [ ] **Step 8: Run the render checks**

Run: `npm run check:render`
Expected: `All render checks passed.` (13 ok lines).

- [ ] **Step 9: Typecheck and commit**

Run: `npm run typecheck --workspace=web`
Expected: no `error TS` lines.

```bash
git add web/app/components/blocks web/app/components/BlockRenderer.vue scripts/render-check.mjs
git commit -m "feat(web): featured news and events layouts, stories columns, gold hero" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Inner pages

**Files:**
- Rewrite: `web/app/pages/news/index.vue`
- Rewrite: `web/app/pages/news/[slug].vue`
- Rewrite: `web/app/pages/events/index.vue`
- Rewrite: `web/app/pages/staff.vue`
- Rewrite: `web/app/pages/downloads.vue`
- Rewrite: `web/app/pages/contact.vue`
- Rewrite: `web/app/error.vue`
- Modify: `scripts/render-check.mjs`

**Interfaces:**
- Consumes: everything produced by Task 11; `GET /api/content/posts?limit&offset&category`, `GET /api/content/posts/categories`, `GET /api/content/posts/:slug` → `{ post, related }` (Task 6), `GET /api/content/events` (Task 5).
- Produces: `/news` reads `?category=` and `?page=`, 12 per page.

- [ ] **Step 1: Add the failing render checks**

Insert above `// ---- end of checks`:

```js
// ---- Task 13: inner pages --------------------------------------------------

check('/news', 'category chips with "All" current', (h) => {
  const nav = between(h, 'aria-label="News categories"', '</nav>')
  return /aria-current="page"[^>]*>\s*All\s*</.test(nav) && nav.includes('Student Life')
})

check('/news', 'first page: one large featured card, then eight standard', (h) =>
  count(h, /data-news-card="large"/) === 1 && count(h, /data-news-card="standard"/) === 8 && !h.includes('Older articles'),
)

check('/news?category=Student%20Life', 'filtered view: chip current, standard cards only, title names the category', (h) =>
  /aria-current="page"[^>]*>\s*Student Life\s*</.test(between(h, 'aria-label="News categories"', '</nav>')) &&
  count(h, /data-news-card="large"/) === 0 &&
  count(h, /data-news-card="standard"/) === 3 &&
  h.includes('News — Student Life'),
)

check('/news/grade-5-science-fair-2026', 'article band with breadcrumb to News', (h) => {
  const band = between(h, 'data-page-header', '</header>')
  return band.includes('aria-label="Breadcrumb"') && band.includes('href="/news"') && band.includes('Grade 5 Science Fair Winners')
})

check('/news/grade-5-science-fair-2026', 'related articles from the same category', (h) => {
  const related = between(h, 'More from Student Life', 'data-site-footer')
  return related !== '' && count(related, /data-news-card="standard"/) === 2
})

check('/events', 'events grouped under month headings with date badges', (h) =>
  /<h2[^>]*>\s*(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}\s*<\/h2>/.test(h) &&
  count(h, /data-date-badge/) === 5,
)

check('/staff', 'six portrait staff cards', (h) => count(h, /data-staff-card/) === 6 && h.includes('aspect-[4/5]'))

check('/downloads', 'downloads page has the band and the sample files', (h) =>
  h.includes('data-page-header') && h.includes('Enrolment Form (sample)'),
)

check('/contact', 'contact details sit in a maroon panel beside the form', (h) =>
  /data-contact-panel[^>]*class="[^"]*bg-maroon/.test(h) && h.includes('(02) 8123 4567') && h.includes('Your name'),
)
```

- [ ] **Step 2: Run the checks and verify the new ones fail**

Run: `npm run check:render`
Expected: the Task 13 checks FAIL; earlier checks still pass.

- [ ] **Step 3: News index**

Replace `web/app/pages/news/index.vue`:

```vue
<script setup lang="ts">
import type { PostSummary } from '~/types/content'

// Re-create the page when the query changes, so category and page links fetch
// fresh data instead of reusing the previous result.
definePageMeta({ key: (route) => route.fullPath })

const PER_PAGE = 12
const route = useRoute()

const category = typeof route.query.category === 'string' && route.query.category ? route.query.category : null
const page = Math.max(1, Number.parseInt(String(route.query.page ?? '1'), 10) || 1)

const params = new URLSearchParams({ limit: String(PER_PAGE), offset: String((page - 1) * PER_PAGE) })
if (category) params.set('category', category)

const [{ data }, { data: cats }] = await Promise.all([
  useApi<{ posts: PostSummary[]; total: number }>(`/content/posts?${params}`),
  useApi<{ categories: string[] }>('/content/posts/categories'),
])

const posts = computed(() => data.value?.posts ?? [])
const showFeatured = computed(() => page === 1 && !category && posts.value.length > 0)
const gridPosts = computed(() => (showFeatured.value ? posts.value.slice(1) : posts.value))
const hasOlder = computed(() => page * PER_PAGE < (data.value?.total ?? 0))

function href(opts: { category?: string | null; page?: number }) {
  const q = new URLSearchParams()
  if (opts.category) q.set('category', opts.category)
  if (opts.page && opts.page > 1) q.set('page', String(opts.page))
  const s = q.toString()
  return s ? `/news?${s}` : '/news'
}

useSeoMeta({
  title: category ? `News — ${category}` : 'News',
  description: category
    ? `${category} articles from Cherished Moments School.`
    : 'News and updates from Cherished Moments School.',
})
</script>

<template>
  <div>
    <PageHeader
      :title="category ?? 'News'"
      eyebrow="From the school"
      :intro="category ? undefined : 'Announcements, achievements and stories from around the school.'"
      :breadcrumbs="category ? [{ label: 'Home', to: '/' }, { label: 'News', to: '/news' }, { label: category }] : [{ label: 'Home', to: '/' }, { label: 'News' }]"
    />

    <div class="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <nav aria-label="News categories">
        <ul class="flex flex-wrap gap-2">
          <li>
            <NuxtLink :to="href({})" :aria-current="!category ? 'page' : undefined" class="chip" :class="{ 'chip-active': !category }">
              All
            </NuxtLink>
          </li>
          <li v-for="c in cats?.categories ?? []" :key="c">
            <NuxtLink
              :to="href({ category: c })"
              :aria-current="category === c ? 'page' : undefined"
              class="chip"
              :class="{ 'chip-active': category === c }"
            >
              {{ c }}
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <p v-if="!posts.length" class="mt-10 text-ink-muted">There is nothing here yet. Please check back soon.</p>

      <template v-else>
        <NewsCard v-if="showFeatured" :post="posts[0]!" variant="large" :heading-level="2" class="mt-10" />

        <ul v-if="gridPosts.length" class="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3" :class="showFeatured ? 'mt-14' : 'mt-10'">
          <li v-for="p in gridPosts" :key="p.id">
            <NewsCard :post="p" :heading-level="2" />
          </li>
        </ul>
      </template>

      <!-- Real links, not "Load more": server-rendered, crawlable, shareable. -->
      <nav v-if="page > 1 || hasOlder" aria-label="Pagination" class="mt-14 flex justify-between gap-4">
        <NuxtLink v-if="page > 1" :to="href({ category, page: page - 1 })" class="btn-outline">← Newer articles</NuxtLink>
        <span v-else />
        <NuxtLink v-if="hasOlder" :to="href({ category, page: page + 1 })" class="btn-outline">Older articles →</NuxtLink>
      </nav>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Article page**

Replace `web/app/pages/news/[slug].vue`:

```vue
<script setup lang="ts">
import type { RichTextDoc } from '@cms/shared'
import type { MediaItem } from '~/composables/useMedia'
import type { PostSummary } from '~/types/content'

interface PostDetail {
  post: {
    id: string
    slug: string
    title: string
    excerpt: string | null
    body: RichTextDoc | null
    category: string | null
    publishedAt: string
    seo: Record<string, string | boolean> | null
    cover: MediaItem | null
  }
  related: PostSummary[]
  redirectTo?: string
}

const slug = useRoute().params.slug as string
const { data, error } = await useApi<PostDetail>(`/content/posts/${slug}`)

if (data.value?.redirectTo) {
  await navigateTo(data.value.redirectTo, { redirectCode: 301, replace: true })
}
if (error.value || !data.value?.post) {
  throw createError({ statusCode: 404, statusMessage: 'Article not found', fatal: true })
}

const post = computed(() => data.value!.post)
const related = computed(() => data.value?.related ?? [])
const seo = computed(() => post.value.seo ?? {})

useSeoMeta({
  title: () => (seo.value.title as string) || post.value.title,
  description: () => (seo.value.description as string) || post.value.excerpt || undefined,
  ogType: 'article',
  ogTitle: () => post.value.title,
  ogImage: () => post.value.cover?.url,
  articlePublishedTime: () => post.value.publishedAt,
})

useArticleSchema({
  title: post.value.title,
  excerpt: post.value.excerpt,
  publishedAt: post.value.publishedAt,
  coverUrl: post.value.cover?.url,
  slug: post.value.slug,
})
</script>

<template>
  <div>
    <PageHeader
      :title="post.title"
      :breadcrumbs="[{ label: 'Home', to: '/' }, { label: 'News', to: '/news' }, { label: post.title }]"
    >
      <p class="mt-5 flex flex-wrap items-center gap-3 text-sm text-cream/90">
        <NuxtLink
          v-if="post.category"
          :to="`/news?category=${encodeURIComponent(post.category)}`"
          class="rounded-full bg-cream/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-gold-light hover:bg-cream/20"
        >
          {{ post.category }}
        </NuxtLink>
        <time :datetime="post.publishedAt">{{ formatLongDate(post.publishedAt) }}</time>
      </p>
    </PageHeader>

    <article class="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <img
        v-if="post.cover"
        :src="post.cover.srcset.find((s) => s.width >= 1200)?.url ?? post.cover.url"
        :srcset="srcsetFor(post.cover)"
        sizes="(min-width: 768px) 46rem, 92vw"
        :alt="post.cover.alt"
        :width="post.cover.width ?? undefined"
        :height="post.cover.height ?? undefined"
        class="w-full rounded-card object-cover"
      />
      <p v-if="post.excerpt" class="text-pretty text-xl leading-relaxed text-ink-muted" :class="post.cover ? 'mt-10' : ''">
        {{ post.excerpt }}
      </p>
      <div class="mt-8">
        <RichTextRenderer :doc="post.body" />
      </div>
    </article>

    <section v-if="related.length" class="border-t border-hairline bg-white">
      <div class="mx-auto max-w-6xl px-5 py-14">
        <SectionHeading :title="`More from ${post.category}`" />
        <ul class="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="r in related" :key="r.id">
            <NewsCard :post="r" :heading-level="3" />
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
```

- [ ] **Step 5: Events page**

Replace `web/app/pages/events/index.vue`:

```vue
<script setup lang="ts">
import type { EventItem } from '~/types/content'

const { data } = await useApi<{ events: EventItem[] }>('/content/events?limit=40')

const months = computed(() => {
  const groups = new Map<string, EventItem[]>()
  for (const e of data.value?.events ?? []) {
    const key = formatMonthYear(e.startsAt)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(e)
  }
  return [...groups.entries()]
})

useSeoMeta({
  title: 'Events',
  description: 'Upcoming events at Cherished Moments School.',
})

// Schools get real value from event rich results — a parent searching for the
// school often gets the next event surfaced directly.
useEventListSchema(data.value?.events ?? [])
</script>

<template>
  <div>
    <PageHeader
      title="Events"
      eyebrow="School calendar"
      intro="What is coming up. Events stay listed until they finish."
      :breadcrumbs="[{ label: 'Home', to: '/' }, { label: 'Events' }]"
    />

    <div class="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <p v-if="!months.length" class="text-ink-muted">There are no upcoming events at the moment.</p>

      <section v-for="[month, items] in months" :key="month" class="mb-14 last:mb-0">
        <h2 class="border-b border-hairline pb-3 font-display text-2xl font-semibold text-maroon">{{ month }}</h2>

        <ul class="mt-2 divide-y divide-hairline">
          <li v-for="e in items" :key="e.id" class="flex gap-6 py-6">
            <DateBadge :date="e.startsAt" />
            <div class="min-w-0">
              <h3 class="font-display text-xl font-semibold leading-snug text-maroon">{{ e.title }}</h3>
              <p class="mt-1.5 text-sm text-ink-muted">
                {{ eventWhen(e) }}<template v-if="e.location"> &middot; {{ e.location }}</template>
              </p>
              <div v-if="e.description" class="mt-3 text-sm">
                <RichTextRenderer :doc="e.description" />
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
```

- [ ] **Step 6: Staff page**

Replace `web/app/pages/staff.vue`:

```vue
<script setup lang="ts">
import type { MediaItem } from '~/composables/useMedia'

interface StaffMember {
  id: string
  name: string
  roleTitle: string | null
  department: string | null
  bio: string | null
  email: string | null
  photo: MediaItem | null
}

const { data } = await useApi<{ staff: StaffMember[] }>('/content/staff')

/**
 * Grouped by department in the order the API returns them (department, then
 * the school's own ordering), so the principal can come first rather than
 * whoever is alphabetically lucky.
 */
const groups = computed(() => {
  const out = new Map<string, StaffMember[]>()
  for (const person of data.value?.staff ?? []) {
    const key = person.department ?? 'Staff'
    if (!out.has(key)) out.set(key, [])
    out.get(key)!.push(person)
  }
  return [...out.entries()]
})

const initials = (name: string) =>
  name
    .replace(/^(Dr|Mr|Mrs|Ms)\.?\s+/i, '')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')

useSeoMeta({
  title: 'Faculty and staff',
  description: 'The teachers and staff of Cherished Moments School.',
})
</script>

<template>
  <div>
    <PageHeader
      title="Faculty and staff"
      eyebrow="Who we are"
      intro="The teachers and staff who know every child by name."
      :breadcrumbs="[{ label: 'Home', to: '/' }, { label: 'Faculty and staff' }]"
    />

    <div class="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <p v-if="!groups.length" class="text-ink-muted">Staff details will appear here shortly.</p>

      <section v-for="[department, people] in groups" :key="department" class="mb-16 last:mb-0">
        <h2 class="border-b border-hairline pb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
          {{ department }}
        </h2>

        <ul class="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          <li v-for="person in people" :key="person.id" data-staff-card>
            <img
              v-if="person.photo"
              :src="person.photo.srcset.find((s) => s.width >= 400)?.url ?? person.photo.url"
              :srcset="srcsetFor(person.photo)"
              sizes="(min-width: 1024px) 16rem, (min-width: 640px) 45vw, 92vw"
              :alt="person.photo.alt"
              :width="person.photo.width ?? undefined"
              :height="person.photo.height ?? undefined"
              loading="lazy"
              class="aspect-[4/5] w-full rounded-card object-cover"
            />
            <div
              v-else
              class="grid aspect-[4/5] w-full place-items-center rounded-card bg-maroon-tint font-display text-4xl font-semibold text-maroon"
              aria-hidden="true"
            >
              {{ initials(person.name) }}
            </div>

            <h3 class="mt-4 font-display text-lg font-semibold leading-snug text-maroon">{{ person.name }}</h3>
            <p v-if="person.roleTitle" class="mt-0.5 text-sm text-ink-muted">{{ person.roleTitle }}</p>
            <p v-if="person.bio" class="mt-2 text-sm leading-relaxed text-ink-muted">{{ person.bio }}</p>
            <p v-if="person.email" class="mt-2 text-sm">
              <a :href="`mailto:${person.email}`" class="text-gold-ink underline underline-offset-2">{{ person.email }}</a>
            </p>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
```

- [ ] **Step 7: Downloads page**

Replace `web/app/pages/downloads.vue`:

```vue
<script setup lang="ts">
import type { MediaItem } from '~/composables/useMedia'

interface DownloadItem {
  id: string
  title: string
  description: string | null
  category: string | null
  file: MediaItem | null
}

const { data } = await useApi<{ downloads: DownloadItem[] }>('/content/downloads')

const groups = computed(() => {
  const out = new Map<string, DownloadItem[]>()
  for (const item of data.value?.downloads ?? []) {
    // A row whose file was deleted from Media would render as a dead link.
    if (!item.file) continue
    const key = item.category ?? 'Documents'
    if (!out.has(key)) out.set(key, [])
    out.get(key)!.push(item)
  }
  return [...out.entries()]
})

const kind = (mime: string) => (mime === 'application/pdf' ? 'PDF' : (mime.split('/')[1]?.toUpperCase() ?? 'FILE'))

useSeoMeta({
  title: 'Forms and downloads',
  description: 'Forms, policies and documents to download.',
})
</script>

<template>
  <div>
    <PageHeader
      title="Forms and downloads"
      eyebrow="For parents"
      intro="Forms, policies and documents to download."
      :breadcrumbs="[{ label: 'Home', to: '/' }, { label: 'Forms and downloads' }]"
    />

    <div class="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <p v-if="!groups.length" class="text-ink-muted">There are no documents to download at the moment.</p>

      <section v-for="[category, items] in groups" :key="category" class="mb-12 last:mb-0">
        <SectionHeading :title="category" />

        <ul class="mt-6 divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-white">
          <li v-for="d in items" :key="d.id">
            <a :href="d.file!.url" download class="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gold-tint/40">
              <span class="shrink-0 rounded bg-maroon px-2 py-1 text-xs font-bold text-cream" aria-hidden="true">
                {{ kind(d.file!.mime) }}
              </span>
              <span class="min-w-0 flex-1">
                <span class="block font-medium text-ink">{{ d.title }}</span>
                <span v-if="d.description" class="mt-0.5 block text-sm text-ink-muted">{{ d.description }}</span>
              </span>
              <!-- Type and size in the link: parents on mobile data deserve to know before they tap. -->
              <span class="shrink-0 text-xs text-ink-muted">{{ kind(d.file!.mime) }}, {{ formatBytes(d.file!.size) }}</span>
            </a>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
```

- [ ] **Step 8: Contact page**

Replace `web/app/pages/contact.vue`:

```vue
<script setup lang="ts">
const { data: chrome } = await useChrome()
const settings = computed(() => chrome.value?.settings)

const form = reactive({ name: '', email: '', phone: '', subject: '', message: '', website: '' })
const sent = ref(false)
const error = ref('')
const pending = ref(false)

async function submit() {
  error.value = ''
  pending.value = true
  try {
    await $fetch('/api/content/inquiries', { method: 'POST', body: { ...form, source: 'contact' } })
    sent.value = true
  } catch (err) {
    error.value = apiErrorMessage(err, 'Your message could not be sent. Please try again, or telephone the school.')
  } finally {
    pending.value = false
  }
}

useSeoMeta({
  title: 'Contact',
  description: () => `How to reach ${settings.value?.['site.name'] ?? 'the school'}.`,
})
</script>

<template>
  <div>
    <PageHeader
      title="Contact us"
      eyebrow="Get in touch"
      intro="The school office is happy to answer questions about admissions, visits or anything else."
      :breadcrumbs="[{ label: 'Home', to: '/' }, { label: 'Contact' }]"
    />

    <div class="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:py-16 lg:grid-cols-5">
      <div class="lg:col-span-2">
        <div data-contact-panel class="rounded-card bg-maroon p-8 text-cream/90">
          <h2 class="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-light">The school office</h2>
          <address class="mt-5 space-y-4 not-italic leading-relaxed">
            <p v-if="settings?.['contact.address']" class="whitespace-pre-line">{{ settings['contact.address'] }}</p>
            <p v-if="settings?.['contact.phone']">
              <a :href="`tel:${settings['contact.phone']}`" class="text-gold-light underline underline-offset-2 hover:text-cream">
                {{ settings['contact.phone'] }}
              </a>
            </p>
            <p v-if="settings?.['contact.email']">
              <a :href="`mailto:${settings['contact.email']}`" class="text-gold-light underline underline-offset-2 hover:text-cream">
                {{ settings['contact.email'] }}
              </a>
            </p>
          </address>
        </div>

        <!-- Lazy-loaded: a map embed outweighs the rest of this page. -->
        <iframe
          v-if="settings?.['contact.mapEmbedUrl']"
          :src="settings['contact.mapEmbedUrl']"
          title="Map showing the school location"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          class="mt-6 aspect-[4/3] w-full rounded-card border border-hairline"
        />
      </div>

      <div class="lg:col-span-3">
        <div v-if="sent" class="rounded-card border border-hairline bg-white p-8">
          <h2 class="font-display text-2xl font-semibold text-maroon">Thank you</h2>
          <p class="mt-3 leading-relaxed text-ink-muted">Your message has reached the school office. Someone will be in touch.</p>
          <p class="mt-3 leading-relaxed text-ink-muted">If it is urgent, please telephone rather than wait for a reply.</p>
        </div>

        <form v-else class="space-y-5 rounded-card border border-hairline bg-white p-8" @submit.prevent="submit">
          <h2 class="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">Send a message</h2>

          <UiAlert v-if="error" tone="error">{{ error }}</UiAlert>

          <div class="grid gap-5 sm:grid-cols-2">
            <UiField v-model="form.name" label="Your name" required autocomplete="name" />
            <UiField v-model="form.email" label="Email" type="email" required autocomplete="email" />
          </div>
          <div class="grid gap-5 sm:grid-cols-2">
            <UiField v-model="form.phone" label="Telephone" hint="Optional." autocomplete="tel" />
            <UiField v-model="form.subject" label="Subject" hint="Optional." />
          </div>

          <div>
            <label for="message" class="block text-sm font-semibold text-ink">
              Message <span class="text-maroon" aria-hidden="true">*</span>
            </label>
            <textarea
              id="message"
              v-model="form.message"
              rows="6"
              required
              class="mt-1.5 w-full rounded-card border border-hairline px-3 py-2.5 text-base"
            />
          </div>

          <!-- Honeypot: hidden from people and from screen readers. -->
          <div hidden aria-hidden="true">
            <label for="website">Leave this field empty</label>
            <input id="website" v-model="form.website" type="text" tabindex="-1" autocomplete="off" />
          </div>

          <button type="submit" class="btn-maroon" :disabled="pending" :aria-busy="pending">
            {{ pending ? 'Sending…' : 'Send message' }}
          </button>

          <p class="text-xs leading-relaxed text-ink-muted">
            Messages go to the school office. Please do not send anything urgent or confidential through this form.
          </p>
        </form>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 9: Error page**

Replace `web/app/error.vue`:

```vue
<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const is404 = computed(() => props.error?.statusCode === 404)

useHead({
  title: () => (is404.value ? 'Page not found' : 'Something went wrong'),
  meta: [{ name: 'robots', content: 'noindex' }],
})

/**
 * Self-contained on purpose: the default layout fetches site chrome from the
 * API, and the likeliest cause of a 500 is the API being unreachable.
 */
</script>

<template>
  <div class="grid min-h-dvh place-items-center bg-maroon px-6 py-16">
    <div class="w-full max-w-md text-center">
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-light">Cherished Moments School</p>
      <h1 class="mt-4 font-display text-4xl font-semibold text-cream">
        {{ is404 ? 'We cannot find that page' : 'Something went wrong' }}
      </h1>
      <div class="mx-auto mt-5 h-0.5 w-11 bg-gold" />
      <p class="mt-5 leading-relaxed text-cream/90">
        <template v-if="is404">The page may have been moved or removed. The links below should help.</template>
        <template v-else>Please try again in a moment. If it keeps happening, telephone the school office.</template>
      </p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <NuxtLink to="/" class="btn-gold">Go to the homepage</NuxtLink>
        <NuxtLink to="/contact" class="btn-ghost-light">Contact the school</NuxtLink>
      </div>
      <p class="mt-10 text-xs text-cream/70">Error {{ error?.statusCode }}</p>
    </div>
  </div>
</template>
```

- [ ] **Step 10: Run the render checks**

Run: `npm run check:render`
Expected: `All render checks passed.` (22 ok lines).

- [ ] **Step 11: Typecheck and commit**

Run: `npm run typecheck --workspace=web`
Expected: no `error TS` lines.

```bash
git add web/app/pages/news web/app/pages/events web/app/pages/staff.vue web/app/pages/downloads.vue web/app/pages/contact.vue web/app/error.vue scripts/render-check.mjs
git commit -m "feat(web): restyled inner pages — filters, related articles, month groups" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: Navigation admin — nesting

**Files:**
- Rewrite: `web/app/pages/admin/navigation.vue`

**Interfaces:**
- Consumes: `GET /api/site/navigation` → `{ tree: NavInputItem[] }`; `PUT /api/site/navigation` with `{ items: NavInputItem[] }` → `{ tree }` (Task 3).

- [ ] **Step 1: Rewrite the screen**

Replace `web/app/pages/admin/navigation.vue`:

```vue
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Navigation — CMS' })

type Location = 'header' | 'footer'

interface NavLinkInput {
  label: string
  pageId?: string | null
  url?: string | null
  opensNewTab?: boolean
}
interface NavInputItem extends NavLinkInput {
  location: Location
  children?: NavLinkInput[]
}
interface Row {
  key: string
  location: Location
  depth: 0 | 1
  label: string
  pageId: string | null
  url: string
}
interface PageOption {
  id: string
  title: string
  slug: string
  status: string
}

const rows = ref<Row[]>([])
const pages = ref<PageOption[]>([])
const error = ref('')
const notice = ref('')
const pending = ref(false)

const toRow = (item: NavLinkInput, location: Location, depth: 0 | 1): Row => ({
  key: crypto.randomUUID(),
  location,
  depth,
  label: item.label,
  pageId: item.pageId ?? null,
  url: item.url ?? '',
})

function fromTree(tree: NavInputItem[]): Row[] {
  const ordered = [...tree].sort((a, b) => (a.location === b.location ? 0 : a.location === 'header' ? -1 : 1))
  return ordered.flatMap((item) => [
    toRow(item, item.location, 0),
    ...(item.children ?? []).map((c) => toRow(c, item.location, 1)),
  ])
}

/** A child always belongs to the nearest top-level row above it in the same menu. */
function toTree(list: Row[]): NavInputItem[] {
  const out: NavInputItem[] = []
  let parent: NavInputItem | null = null
  for (const r of list) {
    const link: NavLinkInput = { label: r.label, pageId: r.pageId, url: r.pageId ? null : r.url || null }
    if (r.depth === 1 && parent && parent.location === r.location) {
      parent.children!.push(link)
    } else {
      parent = { location: r.location, ...link, children: [] }
      out.push(parent)
    }
  }
  return out
}

onMounted(async () => {
  try {
    const [nav, pageList] = await Promise.all([
      $fetch<{ tree: NavInputItem[] }>('/api/site/navigation', { credentials: 'include' }),
      $fetch<{ pages: PageOption[] }>('/api/pages', { credentials: 'include' }),
    ])
    rows.value = fromTree(nav.tree)
    pages.value = pageList.pages
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not load navigation.')
  }
})

const inMenu = (loc: Location) => rows.value.filter((r) => r.location === loc)
const neighbour = (row: Row, delta: -1 | 1) => {
  const list = inMenu(row.location)
  return list[list.indexOf(row) + delta]
}
const hasChildren = (row: Row) => row.depth === 0 && neighbour(row, 1)?.depth === 1
const canIndent = (row: Row) => row.depth === 0 && !!neighbour(row, -1) && !hasChildren(row)
const canOutdent = (row: Row) => row.depth === 1

/** The first row of a menu can never be a child. */
function normalise() {
  for (const loc of ['header', 'footer'] as const) {
    const first = inMenu(loc)[0]
    if (first) first.depth = 0
  }
}

function indent(row: Row) {
  if (canIndent(row)) row.depth = 1
}
function outdent(row: Row) {
  if (canOutdent(row)) row.depth = 0
}

function move(row: Row, delta: -1 | 1) {
  const i = rows.value.indexOf(row)
  const j = i + delta
  if (j < 0 || j >= rows.value.length || rows.value[j]!.location !== row.location) return
  const next = [...rows.value]
  next.splice(i, 1)
  next.splice(j, 0, row)
  rows.value = next
  normalise()
}

function add(location: Location) {
  const row: Row = { key: crypto.randomUUID(), location, depth: 0, label: '', pageId: null, url: '' }
  // Header rows stay above footer rows so each menu remains contiguous.
  const lastInMenu = rows.value.map((r) => r.location).lastIndexOf(location)
  const at = lastInMenu >= 0 ? lastInMenu + 1 : location === 'header' ? 0 : rows.value.length
  const next = [...rows.value]
  next.splice(at, 0, row)
  rows.value = next
}

function remove(row: Row) {
  rows.value = rows.value.filter((r) => r !== row)
  normalise()
}

async function save() {
  error.value = ''
  notice.value = ''
  if (rows.value.some((r) => !r.label.trim())) {
    error.value = 'Every menu item needs a label.'
    return
  }
  pending.value = true
  try {
    const res = await $fetch<{ tree: NavInputItem[] }>('/api/site/navigation', {
      method: 'PUT',
      body: { items: toTree(rows.value) },
      credentials: 'include',
    })
    rows.value = fromTree(res.tree)
    notice.value = 'Saved. The whole site has been refreshed.'
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not save navigation.')
  } finally {
    pending.value = false
  }
}

const isDraft = (pageId: string | null) => !!pageId && pages.value.find((p) => p.id === pageId)?.status === 'draft'
</script>

<template>
  <div>
    <h1 class="font-display text-2xl font-semibold text-maroon">Navigation</h1>
    <p class="mt-1.5 text-sm text-ink-muted">
      The menus in the header and footer. Indent an item to place it in a dropdown under the item above it.
    </p>

    <UiAlert v-if="error" tone="error" class="mt-5">{{ error }}</UiAlert>
    <UiAlert v-if="notice" tone="success" class="mt-5">{{ notice }}</UiAlert>

    <section v-for="loc in (['header', 'footer'] as const)" :key="loc" class="mt-8">
      <h2 class="text-sm font-bold uppercase tracking-wider text-ink-muted">{{ loc }}</h2>
      <p v-if="loc === 'footer'" class="mt-1 text-xs text-ink-muted">
        A footer item with items indented under it becomes a column heading.
      </p>

      <ul class="mt-3 space-y-2">
        <li
          v-for="row in inMenu(loc)"
          :key="row.key"
          class="rounded-card border bg-white p-3"
          :class="row.depth === 1 ? 'ml-8 border-hairline border-l-4 border-l-gold' : 'border-hairline'"
        >
          <div class="grid gap-2 lg:grid-cols-[1fr_1.4fr_auto]">
            <input
              v-model="row.label"
              placeholder="Label"
              aria-label="Menu label"
              class="rounded-card border border-hairline px-3 py-2 text-sm"
            />
            <div class="flex gap-2">
              <select
                v-model="row.pageId"
                aria-label="Link to a page"
                class="min-w-0 flex-1 rounded-card border border-hairline px-2 py-2 text-sm"
              >
                <option :value="null">— custom address —</option>
                <option v-for="p in pages" :key="p.id" :value="p.id">
                  {{ p.title }}{{ p.status === 'draft' ? ' (draft)' : '' }}
                </option>
              </select>
              <input
                v-if="!row.pageId"
                v-model="row.url"
                placeholder="/contact or https://…"
                aria-label="Custom address"
                class="min-w-0 flex-1 rounded-card border border-hairline px-3 py-2 text-sm"
              />
            </div>
            <div class="flex flex-wrap gap-1">
              <UiButton variant="ghost" title="Move up" @click="move(row, -1)">↑</UiButton>
              <UiButton variant="ghost" title="Move down" @click="move(row, 1)">↓</UiButton>
              <UiButton variant="ghost" :disabled="!canIndent(row)" @click="indent(row)">Indent ›</UiButton>
              <UiButton variant="ghost" :disabled="!canOutdent(row)" @click="outdent(row)">‹ Outdent</UiButton>
              <UiButton variant="ghost" @click="remove(row)">Remove</UiButton>
            </div>
          </div>

          <p v-if="hasChildren(row) && (row.pageId || row.url)" class="mt-2 text-xs text-ink-muted">
            This link appears as the first item in the dropdown.
          </p>
          <p v-if="isDraft(row.pageId)" class="mt-2 text-xs text-gold-ink">
            That page is a draft, so this item stays hidden until it is published.
          </p>
        </li>
      </ul>

      <UiButton variant="secondary" class="mt-3" @click="add(loc)">Add to {{ loc }}</UiButton>
    </section>

    <div class="mt-8 border-t border-hairline pt-5">
      <UiButton :loading="pending" @click="save">Save navigation</UiButton>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck --workspace=web`
Expected: no `error TS` lines.

- [ ] **Step 3: Verify by hand**

With `npm run dev` running, sign in and open **Navigation**:
1. The header menu shows **About** with History, Mission & Vision and Faculty & Staff indented under it (gold left edge).
2. **Indent ›** is disabled on the first header row and on **About** (it has children).
3. Outdent **Faculty & Staff**, click **Save navigation**, reload the screen — it stays top-level.
4. Open `http://127.0.0.1:3100/` — **Faculty & Staff** is now a top-level header link.
5. Indent it again, save, reload — it is back under **About**, and the public dropdown lists it last.

Expected: every step matches.

- [ ] **Step 4: Confirm the public site still passes**

Run: `npm run check:render`
Expected: `All render checks passed.`

- [ ] **Step 5: Commit**

```bash
git add web/app/pages/admin/navigation.vue
git commit -m "feat(admin): indent and outdent navigation items into dropdowns" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 15: Final verification and documentation

**Files:**
- Modify: `scripts/a11y-audit.mjs`
- Modify: `README.md`

- [ ] **Step 1: Extend the accessibility audit**

In `scripts/a11y-audit.mjs`, replace the `PAGES` line:

```js
const PAGES = [
  '/',
  '/news',
  '/news?category=Student%20Life',
  '/news/grade-5-science-fair-2026',
  '/events',
  '/staff',
  '/downloads',
  '/contact',
  '/history',
  '/mission-and-vision',
]
```

- [ ] **Step 2: Run the full verification set**

With the demo seeded and `npm run dev` running:

Run: `npm test`
Expected: shared 10 passed; api 25 passed.

Run: `npm run typecheck`
Expected: no `error TS` lines.

Run: `npm run check:render`
Expected: `All render checks passed.` (22 checks).

Run: `npm run audit:a11y`
Expected: `No failures.` across all 10 pages.

Fix any failure before continuing. Report the outputs verbatim.

- [ ] **Step 3: Repeat the keyboard pass**

Repeat Task 10 Step 8 on `/news/grade-5-science-fair-2026` (a page with a breadcrumb and a band) and at 375px width using the mobile **Menu**: Tab to Menu, Enter opens it, Tab to **About**, Enter expands its links, Enter on **History** navigates and the menu closes.

Expected: all behaviours pass. Report exactly what was tried.

- [ ] **Step 4: Screenshots against the reference**

Capture each page at 1440px and 375px wide: `/`, `/news`, `/news/grade-5-science-fair-2026`, `/events`, `/staff`, `/downloads`, `/contact`, `/history`.

For each desktop capture, confirm the structural match with https://up.edu.ph/:
- two-tier maroon header; dropdown on About
- homepage: full-bleed hero → featured news (large + two) → events (featured + dated list) → three stories columns
- maroon footer with column headings
- inner pages open with the maroon band and breadcrumb

For each mobile capture, confirm no horizontal scroll and the Menu button in place of the desktop nav.

- [ ] **Step 5: Document the redesign**

In `README.md`, add after the `## Getting started` section:

````markdown
## Demo content

```bash
npm run seed:demo            # fill the site with sample school content
npm run seed:demo -- --remove  # remove exactly that content
```

`seed:demo` needs an administrator (`npm run create-admin`) and the 18 stock photos listed in `docs/demo-image-credits.md`, saved in `api/data/demo-images/` (gitignored). Every photo is captioned **PLACEHOLDER — replace before launch** in the media library.

Every id it creates is recorded in a manifest, along with a snapshot of the homepage, navigation and settings it replaces. `--remove` deletes exactly those ids and restores the snapshot; content added by a person in the meantime is untouched. Running `seed:demo` twice refuses rather than duplicating.

## Tests and checks

| Command | What it checks | Needs |
|---|---|---|
| `npm test` | API and shared unit tests, on an in-memory database | nothing |
| `npm run typecheck` | All workspaces | nothing |
| `npm run check:render` | Server-rendered structure of every public page | `npm run dev` and `npm run seed:demo` |
| `npm run audit:a11y` | Structural accessibility of every public page | `npm run dev` and `npm run seed:demo` |
````

In the `## Status` section, append:

```markdown
Public site redesign: two-tier maroon header with keyboard-accessible dropdowns, column-driven maroon footer, featured news and events layouts, a stories-columns block, maroon title bands with breadcrumbs, category filtering and pagination on News, related articles, month-grouped events, and removable stock-photo demo content. Layout patterns follow https://up.edu.ph/; branding is the school's own.
```

- [ ] **Step 6: Commit**

```bash
git add scripts/a11y-audit.mjs README.md
git commit -m "docs: demo content, tests and redesign status" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
