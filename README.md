# Cherished Moments School

Public website and admin CMS for Cherished Moments School (est. 1990).

## Documentation

| Doc | What's in it |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Whole-system design, including the paused Release 2 (parent/student portal, SIS, DepEd grading) |
| [docs/release-1.md](docs/release-1.md) | **Active scope** — public site + admin CMS |
| [docs/design-system.md](docs/design-system.md) | Palette, type, logo usage, contrast rules |

Read `release-1.md` first. `architecture.md` exists so Release 1 doesn't paint the portal into a corner — see its §10.

## Stack

Nuxt 4 · Tailwind v4 · Node 22+ · Express 5 · SQLite (WAL) · Drizzle ORM

Two processes. Nuxt serves the site on `:3100`; Express serves the API on `:4100`. In dev, Nitro proxies `/api` to Express so the browser sees one origin — same mapping the reverse proxy does in production, so no CORS anywhere.

## Getting started

```bash
npm install
cp api/.env.example api/.env
cp web/.env.example web/.env
npm run migrate
npm run seed
npm run create-admin
npm run dev
```

**`REVALIDATE_SECRET` in `api/.env` must match `NUXT_REVALIDATE_SECRET` in `web/.env`.** The two processes share it. If they disagree, publishing appears to succeed but silently stops purging the cache and editors see stale pages — the API logs a warning naming this exact cause when it happens.

Then open http://localhost:3100 for the public scaffold, or http://localhost:3100/admin to sign in.

`create-admin` prompts for an email, name and password. There is no public sign-up anywhere in this system, so this is the only way to get the first account — every other user is invited by an administrator from `/admin/users`. It also accepts `--email`, `--name` and `--password` for unattended provisioning, though a password on the command line lands in shell history, so prefer the prompts.

Invitation and reset emails are written as `.eml` files to `api/data/mail/` in development. Open one to get the link — no SMTP required.

## Scripts

Run from the repo root:

| Command | Does |
|---|---|
| `npm run dev` | Both processes, colour-coded output |
| `npm run migrate` | Apply committed migrations |
| `npm run migrate:generate` | Generate a migration after changing the Drizzle schema |
| `npm run seed` | Placeholder content for local development |
| `npm run db:reset` | Delete the database, migrate, reseed |
| `npm run typecheck` | Typecheck all workspaces |
| `npm run audit:a11y` | Structural accessibility check (needs `npm run dev` running) |

## Layout

```
shared/   Types and Zod schemas imported by BOTH web and api
api/      Express 5 + Drizzle
web/      Nuxt 4
docs/     Design and architecture
```

## Conventions

**Routes do HTTP, services do logic and own all DB access, schemas own validation.** No Drizzle queries in route handlers, and nothing in a service touches `res`.

**Errors**: services `throw` from `lib/errors.ts`; `middleware/errorHandler.ts` is the only place a response is formatted. A 5xx never leaks its message.

**IDs** are ULIDs — sortable, safe in URLs, no row counts leaked.

**Mail** is queued through the `outbox` table, never sent inline. The school is on free Gmail (~500 recipients/day) and a bulk invite run exceeds that. `MAIL_TRANSPORT=file` writes `.eml` files to `api/data/mail/` in development, so no one needs live SMTP credentials and no one can accidentally email a parent from a dev machine.

**Gold is not a text colour.** `--color-gold` measures ~3.1:1 on cream — it fails WCAG AA for body text. Use `--color-gold-ink` on light backgrounds, `--color-gold-light` on dark. See the comment at the top of `web/app/assets/css/main.css`.

**Never assume a logged-in user is staff.** Release 2's population is mostly parents. `isStaff(role)` in `shared/src/roles.ts` is the check.

## Environment notes

**Ports are 3100 / 4100, not 3000 / 4000.** This machine already runs other Nuxt projects on the usual ports. Express also binds `127.0.0.1` explicitly, because on Windows a second process can bind a port another process already holds on a different address family *without* an `EADDRINUSE` — you then get a server answering on `::1` but not `127.0.0.1` while a different app answers the other. It presents as "the API is flaky" rather than "there are two APIs".

**`.npmrc` pins this repo to the public npm registry.** The machine-level registry in `~/.npmrc` returns 502 for `drizzle-orm` and `drizzle-kit` while serving everything else. Scoped to this project only; delete the file once the mirror is fixed.

**SWR caching is off in development.** With it on, an edit appears not to work for up to an hour because Nitro keeps serving the previous render.

## Security notes

Worth knowing before changing anything in `api/src/modules/auth`:

- **Login failures are deliberately indistinguishable.** Unknown address, wrong password, disabled account and never-set password all return the same 401, and a fake argon2 verify runs on the unknown-account path so the timing matches. `forgot-password` returns 204 either way for the same reason.
- **Rate limiting is two-dimensional.** Per-IP alone misses a distributed attempt on one known address; per-account alone misses one host spraying many accounts.
- **Sessions are server-side**, so disabling an account or resetting a password takes effect on the next request rather than whenever a token happens to expire.
- **Tokens are stored hashed.** A leaked database backup yields no live sessions and no usable invite links.
- **`requireRole` is only half an authorization decision** — it gates the endpoint, never the row. Release 2 adds the row-level scope check; do not let the habit of role-only checks set in before then.
- **Uploads are identified by magic bytes**, never the declared `Content-Type`, and SVG is rejected outright (see `docs/release-1.md` §5). Multer's size limit is the largest accepted type; the real per-type limit is applied once the format is actually known.
- **`/media` is served publicly and cached immutably.** These are photos for a public website, and routing them through auth would defeat browser caching. Treat anything uploaded as world-readable — Release 2's report cards will not use this path.

## Working on blocks

The registry lives in `shared/src/blocks/`. **Adding a block type is one registry entry plus two components** — an editor under `web/app/components/admin/blocks/` and a public renderer under `web/app/components/blocks/`. Nothing in the page editor, the renderer, or the API changes.

Two rules that are easy to get wrong:

- **Register components as objects, never as name strings.** `<component :is="'SomeName'">` only resolves against globally registered components; Nuxt's auto-import is compile-time, so a runtime string renders *nothing at all* with no error. Import them at the top of `BlockRenderer.vue` and `BlockEditor.vue` and map to the objects.
- **Blocks reference media by id, never by URL.** A URL copied into block data goes stale when the file is replaced, and nothing can then answer "which pages use this image?" — which is also what cache purging needs.

Rich text is TipTap JSON rendered through `RichTextRenderer.vue`, which builds real VNodes. There is no `v-html` in the codebase and there should not be: an unrecognised node type renders as nothing, and link hrefs are allowlisted to `http(s)`, `/`, `mailto:` and `tel:` so a stored `javascript:` URL produces an anchor with no href.

## Status

Phases 0–3 complete, plus the Phase 3 carry-over. Both workspaces typecheck clean.

Phase 0: workspace, design tokens, schema and migrations, seed, logging and error conventions, mailer interface, `useApi`.

Phase 1: argon2id passwords, server-side sessions, invitations, password resets, two-dimensional rate limiting, origin-based CSRF guard, audit logging, the throttled outbox worker, user management, and the `/admin` shell.

Phase 2: media library with magic-byte validation and WebP derivatives; the block registry (`hero`, `richText`, `imageText`); page CRUD; the block editor; signed preview links; publish with cache purge; slug history so renamed pages 301 rather than 404.

Phase 3: news articles, events, navigation, site settings, staff, downloads, announcements and the enquiries inbox — all with API and public endpoints. Public site chrome (header, footer, announcement bar) plus the `/news`, `/news/:slug` and `/events` pages.

Carry-over now done: admin screens for staff, downloads and announcements; all four reference blocks; and the `/staff`, `/downloads` and `/contact` pages.

SEO and accessibility are done: `sitemap.xml` built from live content, environment-aware `robots.txt`, canonical URLs, and `School` / `Article` / `Event` JSON-LD. The structural accessibility audit passes on all six public pages.

The design pass is done: Fraunces Variable self-hosted (36KB, latin subset only), a shared `PageHeader` across every non-CMS page, consistent section rhythm, refined hero and cards, a gold-topped footer, and a self-contained error page.

### Still outstanding

- **The crest vector** — the one hard blocker. Without it the header shows a wordmark rather than a logo, and there is no favicon. See `docs/design-system.md` §5–6.
- **Content loading and staff training**, then launch: domain, TLS, backups.

## Typography

Headings use **Fraunces Variable**, self-hosted through `@fontsource-variable/fraunces` — no third-party request on a school's public site, and no dependency on a CDN the school does not control. Only the `wght` axis is imported; the optical-size axis doubles the payload for a difference invisible at the sizes used.

Body text runs on the **system stack**: zero bytes, instant render, and indistinguishable from a licensed humanist sans at 16px on a phone. That is the whole type budget — one webfont, measured at 36,620 bytes for the latin subset, which is all an English page fetches.

The error page (`app/error.vue`) deliberately does **not** use the default layout: that layout fetches site chrome from the API, and the likeliest cause of a 500 is the API being unreachable. It is self-contained so it still renders when everything else is down.

## SEO

`sitemap.xml` is generated per request from live content and cached for an hour — **not** prerendered. A sitemap frozen at build time lists pages that have since been unpublished and omits everything added since, which is worse than none: it teaches search engines to distrust the file.

`robots.txt` is environment-aware. On a non-production origin it disallows everything, so a staging copy cannot outrank the real school website. `/admin` and `/preview` are disallowed as a courtesy to crawlers, not as a security measure — robots.txt is public and advisory. Both are protected properly (session auth; signed expiring token plus `X-Robots-Tag: noindex`).

Canonical URLs and the `School` schema are emitted **from the layout**, so a new page cannot be added without them.

## Accessibility

```bash
npm run audit:a11y
```

`scripts/a11y-audit.mjs` checks the server-rendered HTML of every public page for: `html[lang]`, exactly one `h1`, no skipped heading levels, `<main>` and other landmarks, a skip link, `alt` on every image, `width`/`height` on content images (layout shift), labelled form controls, links with accessible names, and canonical + title.

It is a structural check, not a substitute for a screen-reader pass — but it catches what is objectively checkable and easy to regress. Run it against a running dev server before any release.

## Reference blocks

`newsTeaser`, `eventsTeaser`, `staffGrid` and `downloadsList` store **a query, not a copy**. Add a staff member and every page showing the staff grid updates. Without this, editors maintain the same list in four places and the four drift — which is how a school site ends up with a teacher who left two years ago still on the About page.

They are resolved **server-side**, in one pass, by `api/src/modules/pages/references.ts`, and arrive in the page payload under `refs` keyed by block id. The alternative — each teaser fetching on mount — means a homepage with three teasers makes four round trips, none of which render during SSR. Queries are deduplicated, so two blocks asking for the same thing hit the database once.

## Content model notes

Two behaviours that look like bugs but are deliberate:

- **A menu item pointing at a draft page disappears from the public menu** and returns when the page is published. Admin always shows every item, with a note explaining why one is hidden.
- **Events stay listed until they *end*, not until they start.** A three-day fair vanishing from the calendar on the morning of day one is the kind of thing parents notice and the school gets blamed for.

Enquiries are **not emailed anywhere**. The free Gmail daily cap is reserved for account mail, and a contact form that emails on submit is a spam amplifier pointed at the school's own inbox. The office reads them in the CMS — agree a routine for checking it before launch.
