# Release 1 — Public Website + Admin CMS

Scope for the active build. Overall system design lives in [architecture.md](architecture.md); the parent/student portal and SIS are paused, and §10 records what this release commits to on their behalf.

**Settled for this release:** English only · school supplies a logo, everything else designed here · draft → publish with a single editor role.

## 1. What ships

A public school website whose every page is editable by office staff, plus the admin CMS that edits it. No student data, no grades, no portal.

| Surface | Routes | Rendering |
|---|---|---|
| Public site | `/` and below | SSR + SWR cache, purged on publish |
| Draft preview | `/preview/:token` | SSR, uncached, `noindex` |
| Admin CMS | `/admin` | SPA (`ssr: false`) |

**Dev ports are 3100 (web) and 4100 (api)**, not the usual 3000/4000, because this machine already runs other Nuxt projects on those. Express binds `127.0.0.1` explicitly: on Windows a second process can bind a port another process already holds on a different address family with no `EADDRINUSE`, producing a server that answers on `::1` but not `127.0.0.1` while a different app answers the other. That presents as "the API is flaky" rather than "there are two APIs".

Roles in this release: **`super_admin`** and **`content_editor`**. The full role enum from architecture.md §5 ships in the schema now so Release 2 adds no migration — but only these two are assignable in the UI.

## 2. Content model

Only the CMS tables from architecture.md §4 are built:

```
pages          id, slug UNIQUE, title, status(draft|published), published_at,
               seo(JSON), created_by, updated_by
page_blocks    id, page_id, seq, type, data(JSON)
posts          id, slug UNIQUE, title, excerpt, body(JSON), cover_media_id,
               category, status, published_at, author_id
events         id, title, slug, starts_at, ends_at, all_day, location,
               description(JSON), cover_media_id, status
media          id, filename, storage_path, mime, size, width, height,
               alt, caption, uploaded_by
navigation     id, location(header|footer), parent_id, label, url,
               page_id NULL, seq, opens_new_tab
staff          id, name, role_title, department, photo_media_id, bio,
               email, seq, is_published
announcements  id, title, body, audience(public|portal|both), starts_at, ends_at
inquiries      id, name, email, phone, subject, message, source,
               handled_by, handled_at, ip
site_settings  key PK, value(JSON)
downloads      id, title, description, media_id, category, seq, is_published
```

Notes:

- **`navigation.page_id`** alongside `url`. Menu items pointing at internal pages reference the page, so renaming a slug doesn't silently 404 the main nav — the single most common CMS foot-gun. Free-form `url` stays available for external links.
- **`announcements.audience`** exists now even though only `public` is reachable. Release 2 turns it on without touching the table.
- **`body(JSON)`** on posts and events, not HTML. See §4.
- **`inquiries.ip`** for spam triage, and because someone will eventually ask where a nasty message came from.

## 3. The block system

Pages are composed of typed blocks, not a rich-text blob. Editors get structure; the site can't be knocked off-design by pasted markup.

### Block registry

One module maps block type → `{ schema, adminComponent, publicComponent, label, icon }`. The Zod schema lives in `shared/` and validates in **both** places: the admin form before save, and the API before write. Adding a block type is one registry entry plus two components — no changes to the page editor, the renderer, or the API.

```
shared/src/blocks/
  index.ts          // registry
  hero.ts           // schema + type, imported by web AND api
  richText.ts
  ...
```

### Block types for v1

| Block | Purpose |
|---|---|
| `hero` | Title, subtitle, background image, up to 2 CTAs |
| `richText` | Prose — the workhorse |
| `imageText` | Image beside text, image left or right |
| `cards` | Feature/program grid: icon or image, title, text, optional link |
| `cta` | Full-width call-to-action band |
| `gallery` | Image grid with lightbox |
| `stats` | Number + label row ("Founded 1968", "1,200 learners") |
| `faq` | Accordion |
| `staffGrid` | Pulls from `staff`, filtered by department |
| `newsTeaser` | Latest N posts, optionally by category |
| `eventsTeaser` | Upcoming events |
| `downloadsList` | Pulls from `downloads`, filtered by category |
| `embed` | Map or video — **allowlisted providers only** (Google Maps, YouTube, Facebook page plugin). Not arbitrary iframe HTML. |
| `contactForm` | Renders the inquiry form |

`staffGrid`, `newsTeaser`, `eventsTeaser` and `downloadsList` are **reference blocks** — they store a query, not a copy. Add a staff member and every page showing the staff grid updates. Editors otherwise end up maintaining the same list in four places and the four drift.

### Editor UX

Vertical list of blocks with add / reorder (drag) / duplicate / delete, each block editing inline in a panel rather than a modal. Live preview is a separate pane, not an inline WYSIWYG — inline WYSIWYG on a block system is a large build and tends to produce a worse editing experience than a clean form beside an accurate preview.

## 4. Rich text

**TipTap, stored as JSON, rendered through a Vue component map.** Never `v-html` on stored content.

Editors are trusted staff, so this isn't primarily about malicious input — it's that storing HTML means every future consumer has to sanitize correctly forever, and one missed spot is an XSS hole on a site parents log into. JSON that renders through a fixed component map has no such surface: an unrecognised node type renders as nothing.

Enabled marks/nodes: headings (h2–h4 only — h1 is the page title), bold, italic, lists, links, blockquote, inline image, table, horizontal rule. Deliberately excluded: font size, color, arbitrary alignment. Those are how a CMS site slowly stops matching its own design.

## 5. Media pipeline

Upload → Express (`multer`, memory or temp) → validate → process with `sharp` → write to `api/data/media/YYYY/MM/<ulid>.<ext>` → row in `media`.

**Validation, in order:** size cap (10MB images, 25MB PDFs) → extension allowlist → **magic-byte sniff**, because the declared MIME type is attacker-controlled and, more mundanely, often just wrong from Windows.

**SVG is rejected outright.** *(Changed during Phase 2 — this section previously proposed allowing it for `super_admin` behind a sanitiser.)*

SVG is XML: it can carry `<script>`, event handlers, `<foreignObject>` and external references, and it is served inline — so a bad one is stored XSS on a site staff sign in to. Hand-written SVG sanitisers leak, and doing it correctly means adding DOMPurify plus jsdom to strip attacker-supplied markup.

The only SVG this site needs is the school crest, and that is a build asset a developer commits, not something the office uploads. Rejecting the format removes the entire class of problem for no practical loss. If a future requirement genuinely needs uploaded SVG, add DOMPurify — do not hand-roll the sanitiser.

Accepted formats are JPEG, PNG, WebP, GIF and PDF, identified by **magic bytes**, never by the declared `Content-Type`.

**On upload**, generate WebP derivatives at a fixed set of widths (400/800/1200/1600) and record intrinsic `width`/`height`. Storing dimensions lets the frontend reserve space and eliminates layout shift, which is otherwise the ugliest thing about a photo-heavy school homepage on a slow connection.

**`alt` is required.** Enforced at the API, not just the form. It's an accessibility obligation for a school, and a required field at upload is the only point where anyone will actually write one.

Serving: Express route with long-lived immutable cache headers (paths are content-addressed by ULID, so they never need invalidation).

## 6. Publishing, caching, preview

The one genuinely fiddly part of this release. Public pages are SWR-cached in Nitro; the CMS is a separate Express process. Publishing has to reach across that boundary or editors will publish and see no change — then publish again, and call you.

**On publish/unpublish/reorder-nav, Express POSTs to a Nuxt internal route** (`/__revalidate`, shared secret, bound to localhost) naming the affected paths. Nitro drops those cache entries.

Purge scope matters and is easy to get wrong:

| Change | Purge |
|---|---|
| Page edited | that path |
| Post published | the post, `/news`, and `/` if the homepage teases news |
| Nav or site settings changed | **everything** — header and footer are on every page |
| Staff / downloads changed | every page containing a block that queries them |

Reference blocks make that last row real: the CMS must be able to answer "which pages contain a `staffGrid`?" Index `page_blocks.type` and query it at purge time rather than guessing.

**SWR is disabled in development** (`$development.routeRules` in `nuxt.config.ts`). With it on, an edit appears not to work for up to an hour because Nitro keeps serving the previously rendered page — indistinguishable from a broken change, and it will cost someone an afternoon. Production keeps the cache and relies on the purge above.

**Preview:** admin "Preview" mints a short-lived signed token; `/preview/:token` renders the draft SSR with caching off and `X-Robots-Tag: noindex`. Tokens expire in ~30 minutes and are single-page-scoped, so a forwarded link doesn't become a permanent hole into unpublished content.

**Scheduled publishing:** `status = published` with a future `published_at` means not-yet-live. A one-minute tick in Express flips eligible rows and fires the same purge. Filter on `published_at <= now` in every public query too — belt and braces, so a stopped worker delays a post rather than leaking it early.

## 7. SEO

- Per-page `seo` JSON: title, description, OG image, `noindex` flag. Falls back to page title + first `richText` block excerpt + site default OG image.
- `sitemap.xml` generated from published pages/posts/events; `robots.txt` with the sitemap reference.
- JSON-LD: `School` on the homepage, `Article` on posts, `Event` on events. Schools get real value from rich results on event and news listings.
- Canonical URLs, and one canonical host — pick `www` or apex and 301 the other.
- Slugs are editable but warn on change, and keep a `slug_history` so old URLs 301 instead of 404.

## 8. Design

The school supplies a logo; everything else is designed here.

**Approach:** derive a palette from the logo, then build tokens in Tailwind v4's `@theme` — color, type scale, spacing, radius, shadow — and design components against the tokens. Nothing hardcodes a hex value.

**Mobile-first is not a slogan here.** Most parents will open this on a phone, often on mobile data, often on a mid- or low-end Android. That drives real constraints: aggressive image budgets, no large JS on public routes, system font stack or a single subset webfont, and testing on a throttled connection rather than a desktop viewport at 1440px.

**Accessibility to WCAG 2.1 AA**, treated as a requirement rather than a pass at the end: AA contrast on the derived palette (check this while picking colors, not after), visible focus states, keyboard-navigable menus, a skip link, real heading hierarchy, labelled forms. A public school site is exactly the case where this matters.

**Component inventory:** header + mobile nav, footer, hero, section heading, card, button (3 variants), form controls, breadcrumb, pagination, tabs, accordion, table, gallery/lightbox, announcement bar, empty states, 404/500.

I'd propose a design direction — palette, type, and one or two key page layouts — for you to react to before building the full set.

## 9. Build order

| Phase | Deliverable |
|---|---|
| 0 | Workspace, Nuxt + Tailwind + tokens, Express + Drizzle, migrations, seed, `mailer.ts` interface with dev `.eml` transport, error/logging conventions |
| 1 | Auth: users, sessions, invite, reset, `requireRole`, `/admin` shell + login. Outbox table + worker (needed for invites, reused by Release 2) |
| 2 | Media library, then the block system: registry, schemas, page CRUD, block editor, preview, publish + purge |
| 3 | Remaining content types: posts, events, staff, downloads, navigation, announcements, site settings, inquiries inbox |
| 4 | Design pass + public site: full page set against real CMS data, responsive, a11y audit, SEO, sitemap, JSON-LD |
| 5 | Content loading with the school, staff training, launch: domain, TLS, backups, uptime check |

Phase 2 is the biggest and most uncertain — the block editor is where CMS projects overrun. Build `richText`, `hero`, and `imageText` end-to-end first and get the school editing a real page with just those three. The remaining block types are then repetitions of a proven pattern, and you'll have found the editor's UX problems while they're still cheap.

Phase 5 is real work, not a formality. Sites stall at 90% because nobody scheduled writing the About page.

## 10. Guardrails for Release 2

Release 1 must not paint the portal into a corner. Five commitments:

1. **`users.role` ships with the full enum** — `super_admin`, `content_editor`, `registrar`, `teacher`, `parent`, `student`. Only the first two are assignable now.
2. **Never assume a user is staff.** Auth, session, and middleware are written to the Release 2 shape from the start. Release 2's population is mostly parents, and code that assumes `user ⇒ staff` is spread across every handler by the time you find out.
3. **`audit_log` is written from Phase 1**, starting with content publishes. Retrofitting audit into an existing service layer is miserable; using it from the start makes it habit.
4. **`outbox` + mailer built in Phase 1**, because invites need them — and Release 2's staged parent rollout (architecture.md §6) then needs no new infrastructure.
5. **`media` is shared.** Report cards and the portal will use the same library. Don't scope it to CMS content.

The one thing to actively resist: letting "it's just a website" justify skipping the row-level authorization pattern in architecture.md §5. Release 1 barely needs it. Release 2 depends on it being habitual.

## 11. Open

1. **The logo** — vector (SVG/AI/PDF) if it exists, otherwise the highest-resolution raster available. Needed before the design pass. If only a low-res raster exists, redrawing it is worth scoping.
2. **Domain** — needed for launch, and it changes the email story (architecture.md §6): a domain makes Google Workspace for Education free for accredited schools, which removes the free-Gmail sending cap before Release 2 rollout ever hits it.
3. **Content inventory** — how many pages, and does copy exist or need writing? This is the usual reason launch slips.
4. **Photography** — a school site is carried by its photos. Are there usable ones, and is there consent for publishing images of learners? That consent question is worth raising with the school early; it is not a technical problem but it will land on this project.
5. **Who is the editor?** One named person, their skill level, and whether they need training material.
