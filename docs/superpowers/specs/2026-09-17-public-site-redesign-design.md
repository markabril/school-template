# Public Site Redesign — Design

**Date:** 2026-09-17
**Status:** Approved in brainstorming, awaiting spec review
**Reference:** https://up.edu.ph/ — layout patterns only

## Goal

Re-lay out the Cherished Moments School public website to follow the page structure of the University of the Philippines website, rendered in the school's own brand (crest maroon, navy and gold; Fraunces headings). Fill the site with realistic, removable mock content so the finished feel can be judged.

The homepage and every section on it remain editable and reorderable by school staff through the CMS.

## Decisions

| Question | Decision |
|---|---|
| Fidelity to reference | Close structure, our brand |
| Borrowed from reference | Layout patterns only — never UP's seal, wordmark or imagery |
| Mock images | Free stock photos (Unsplash licence), through the media pipeline |
| Navigation | One level of dropdowns |
| Homepage sections | Hero, Featured news, Featured events, Stories columns |
| Build approach | Extend the block system (approach A) |
| Hero | Single static hero, no carousel |
| "Featured" article | The newest published article; no feature flag |

## Out of scope

- Site search
- A "pillars" band
- Full mega menu (more than one nesting level, or descriptive panels)
- Visual redesign of the admin interface itself
- The crest mark and seal watermark (blocked on the vector source; slots are left for them)

---

## 1. Layout shell

### Announcement bar
Unchanged position: first element on the page, above the header.

### Utility strip
- Background `maroon-deep`; hidden below the `md` breakpoint.
- Left: `Established {site.foundedYear} · {site.tagline}`.
- Right: phone, email and Facebook link from Settings. Each item is omitted if its setting is empty.
- Scrolls away with the page.

### Main bar
- Background `maroon`, `position: sticky; top: 0`.
- Left: school name in cream Fraunces, tagline beneath in `gold-light`. Built as a slot for a future crest mark.
- Right: top-level header menu in cream. The current section is marked with a gold underline and `aria-current="page"`.

### Dropdowns
- A top-level item with children renders as a button with a caret, `aria-expanded` and `aria-controls`.
- The panel is white with a gold top border and maroon links.
- **Opens on:** pointer hover, click, Enter, Space, ArrowDown.
- **Closes on:** Escape (returning focus to the trigger), click outside, focus leaving the menu, route change.
- Up and Down arrows move between links inside an open panel.
- A top-level item that has children is **not itself a link** in the header — clicking it opens the panel. If that item also has a page or URL set, the link is rendered as the **first entry inside its panel**, using the item's own label. Nothing an editor set is silently dropped, and no single target both opens a menu and navigates.
- The same rule applies to the mobile panel and to footer column headings.

### Mobile header (below `md`)
- A Menu button toggles a full-width panel.
- Parents are expandable rows (`button` with `aria-expanded`); their children are indented beneath.
- The panel closes on route change.

### Footer
- Background `maroon`, 4px `gold` top border.
- **Identity column:** name, tagline, established year, address.
- **Navigation columns:** each top-level *footer* item that has children becomes a column — heading = item label, links = its children. Top-level footer items without children are collected into a final column headed "Links".
- **Contact column:** phone, email, Facebook.
- **Bottom bar:** `© {year} {site.name}`.
- Text uses cream (10.6:1 on maroon) and `gold-light` (6.1:1). Raw `gold` never carries text.

---

## 2. Homepage blocks

### Hero (restyled; schema unchanged)
- Full-bleed image with the existing `navy-deep` scrim.
- Minimum height `70vh` on desktop, content vertically centred.
- Primary button: `gold-light` background, `maroon-deep` text (7.9:1).
- Secondary button: cream outline.

### `newsTeaser` — adds `layout`
Schema addition: `layout: z.enum(['featured', 'grid']).default('grid')`.

- **Stored blocks without `layout`** parse as `grid` — published pages do not change appearance.
- **New blocks** get `layout: 'featured'` from registry defaults.
- `featured` rendering: the first post as a `large` card spanning two of three columns; the next two as `standard` cards stacked in the third column. "See more news" button, bottom-right, links to `/news` (or `/news?category=…` when the block has a category).
- Degradation: 1 post → full width; 2 posts → two equal columns; 0 posts → the section does not render.
- `limit` minimum becomes 3 when `layout` is `featured` (validated with a refinement).

### `eventsTeaser` — adds `layout`
Schema addition: `layout: z.enum(['featured', 'list']).default('list')`. Same default rules as `newsTeaser`.

- `featured` rendering: left column is the next event with its cover image, `DateBadge`, title, time and location. Right column stacks the following events, each with `DateBadge`, title, time and location. "Full calendar" button links to `/events`.
- An event without a cover image shows a maroon panel containing a large `DateBadge` in place of the image.
- The events API adds `cover` (resolved media, or `null`) to each event.

### `storiesColumns` — new block
```ts
storiesColumnsSchema = z.object({
  heading: z.string().max(120).optional(),
  columns: z.array(z.object({
    title: z.string().min(1).max(60),
    category: z.string().min(1).max(60),
    limit: z.number().int().min(1).max(5).default(3),
  })).min(1).max(3),
})
```
- A reference block, resolved server-side in `api/src/modules/pages/references.ts`. Each column's query (`category`, `limit`) goes through the existing deduplicating cache.
- `refs[blockId]` is an array of column results in column order: `{ title, category, posts: PostSummary[] }`.
- Each column: `SectionHeading`-style title, a list of `compact` `NewsCard`s, and a "See more" outline button to `/news?category={category}`.
- A column with no posts renders its title and "Nothing here yet."; the block renders nothing only if every column is empty.
- Registered in `REFERENCE_BLOCK_TYPES`.

### `SectionHeading` (new component)
Props: `title`, `link?: { label, href }`. Maroon Fraunces title with a gold rule beneath; the optional link is right-aligned on desktop and below the title on mobile.

### Cache purge scope (fix)
Publishing, unpublishing, updating or deleting content purges, in addition to its existing paths, **every published page containing a block of a type that displays that content**:

| Content changed | Block types |
|---|---|
| Post | `newsTeaser`, `storiesColumns` |
| Event | `eventsTeaser` |
| Staff | `staffGrid` |
| Download | `downloadsList` |

Implemented as one helper, `pathsForBlockTypes(types)`, which queries `page_blocks` by the indexed `type` column joined to `pages`. Staff and downloads currently purge everything; they switch to the helper **plus their own index page** (`/staff`, `/downloads`). Settings, navigation and announcements still purge everything, because they appear in the header and footer of every page.

---

## 3. Inner pages

### `PageHeader` (restyled)
- Maroon band; cream Fraunces title; `gold-light` eyebrow; intro in cream at 90% opacity (≥ 8:1 on maroon).
- New prop `breadcrumbs?: Array<{ label: string; to?: string }>`, rendered through `Breadcrumbs` as a `nav` with `aria-label="Breadcrumb"`, the last item carrying `aria-current="page"`.

### CMS pages (`[...slug].vue`)
If the first block is **not** a `hero`, render `PageHeader` with the page title and breadcrumb `Home › {title}` before the blocks.

### News index (`/news`)
- Reads `?category=` and `?page=` (12 per page).
- Category chips: "All" plus each category from `/api/content/posts/categories`, as links; the active chip has `aria-current="page"`.
- First page with no category filter: newest post as a `large` card, then a three-column grid of `standard` cards.
- Any later page, or any filtered view: `standard` cards only.
- "Newer articles" / "Older articles" links, server-rendered.
- The page title becomes `News — {category}` when filtered.

### Article (`/news/:slug`)
- `PageHeader` band with category chip, date, title and breadcrumb `Home › News › {title}`.
- Cover image at container width, then the body at reading width.
- "More from {category}": up to three other published posts in the same category, as `standard` cards. Hidden when there are none. The public post endpoint returns them as `related`.

### Events (`/events`)
Grouped under month headings (`October 2026`); each row uses `DateBadge`, title, time, location and description.

### Staff (`/staff`)
Portrait photos at 4:5 (initials placeholder when absent), name and role beneath, grouped by department under gold-ruled headings.

### Downloads, Contact
Structure unchanged; restyled to the shell. Contact details move into a maroon panel beside the white form card.

### Error page
Stays self-contained (no API dependency); primary button uses the gold pill style.

### Shared components
| Component | Used by |
|---|---|
| `NewsCard` (`large` / `standard` / `compact`) | featured news block, news index, stories columns, related articles |
| `DateBadge` | events block, events page |
| `SectionHeading` | all homepage sections |
| `Breadcrumbs` | `PageHeader` |

---

## 4. Admin changes

### Navigation screen
- Each row gains **Indent ›** and **‹ Outdent**.
- A row may be indented only if the row directly above it is in the same location. Indenting a row makes it a child of the nearest top-level row above it. A row that has children cannot be indented.
- Children display indented with a gold left border.
- A row with children shows a note under its link field: "This link appears as the first item in the dropdown."
- The footer section explains that a top-level item with items beneath it becomes a column heading.
- On save the editor sends a nested tree:
  ```ts
  items: Array<{ location, label, pageId?, url?, opensNewTab?, children?: Array<{ label, pageId?, url?, opensNewTab? }> }>
  ```
- The API schema allows exactly one level of `children`. In one transaction, the service deletes all rows, inserts each parent, then inserts its children with the parent's new id. `seq` preserves order within each level.

### Events screen
An edit panel for existing events: title, starts, ends, all day, location, description (`AdminRichTextInput`) and cover image (`AdminMediaPicker`). The events PATCH route and service accept `coverMediaId`.

### Block editors
- `NewsTeaserEditor` and `EventsTeaserEditor`: a **Layout** radio group.
- New `StoriesColumnsEditor`: optional heading plus up to three column rows (title, category select populated from existing categories, count 1–5), each removable and movable up/down, with an "Add a column" button hidden at three.

---

## 5. Mock content

### `npm run seed:demo`
Location: `api/src/scripts/seed-demo.ts`. Writes only through existing services.

Creates exactly:
- **18 photos** from `api/data/demo-images/`, all uploaded through the media service with descriptive alt text and the caption `PLACEHOLDER — replace before launch`. Roles: 1 hero, 6 article covers, 3 event covers, 2 for the history page, 6 staff portraits.
- **9 posts**, 3 in each of **Principal's Corner**, **Student Life** and **Community**, published with dates spread over the previous eight weeks. 6 have covers.
- **5 events** in the next ten weeks, 3 with covers.
- **6 staff** in **Leadership** (2) and **Faculty** (4), published, each with a portrait.
- **2 downloads** — "Enrolment Form (sample)" and "School Calendar (sample)" — each a one-page PDF **generated by the script**, not downloaded, uploaded through the media service like any other file.
- **Settings:** address, phone, email, Facebook.
- **Navigation.** Header: *Home · About ▸ (History, Mission & Vision, Faculty & Staff) · News · Events · Contact*. Footer: *For Parents ▸ (Downloads, Events, Contact)* and *School ▸ (History, News)*.
- **Pages:** `history` and `mission-and-vision`, each a single rich-text block, published.
- **Homepage:** if a `home` page does not exist it is created. Its blocks are **replaced** with Hero → `newsTeaser` (featured) → `eventsTeaser` (featured) → `storiesColumns` (the three categories).

### Manifest and removal
- Every created id is written to the `site_settings` key `demo.manifest`, together with a snapshot of the homepage blocks, navigation rows and settings as they were **before** seeding.
- If the manifest exists, `seed:demo` refuses to run.
- `npm run seed:demo -- --remove` deletes exactly the ids in the manifest (and their media files), restores the homepage blocks, navigation and settings from the snapshot, then deletes the manifest.
- Removal never deletes by pattern or caption.

### Images
- 18 photos sourced from Unsplash under the Unsplash licence.
- **Before downloading**, the proposed list — photo page URL, photographer, subject, intended role, approximate size — is presented for approval.
- Stored in `api/data/demo-images/` (gitignored), never committed.

---

## 6. Verification

1. `npm run typecheck` — zero errors in both workspaces.
2. Smoke tests, extended:
   - nested navigation saves and reloads as the same tree; a grandchild is rejected
   - `storiesColumns`: more than three columns rejected; resolution returns posts per category in column order
   - events return `cover`; PATCH sets `coverMediaId`
   - `/api/content/posts?category=` filters; pagination offsets correctly
   - `related` excludes the article itself
   - `pathsForBlockTypes` returns only published pages that contain the given types
   - `seed:demo` twice refuses; `--remove` leaves the pre-seed row counts
3. `npm run audit:a11y` extended to the article page, a CMS page and a filtered news page — no failures.
4. Manual keyboard pass on header dropdowns, reported step by step: Tab reaches trigger; Enter/Space/ArrowDown opens; arrows move; Escape closes and returns focus; Tab past the last link closes.
5. Desktop (1440px) and mobile (375px) screenshots of home, news, article, events, staff, downloads, contact and a CMS page, checked against the reference structure.
