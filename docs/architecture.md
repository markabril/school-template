# School Website — Architecture & Build Plan

Status: draft v2 · **Active scope: Release 1 — public website + admin CMS (Phases 0–3).**

> Release 2 (parent/student portal, SIS, grading, fees, DepEd forms) is **planned but paused**. Everything about it below is kept deliberately: the data model, roles, and email design were built knowing it's coming, and Release 1 must not paint it into a corner. See §10 for what Release 1 is committing to on its behalf.

## 1. Scope

Three surfaces, one codebase:

| Surface | Route prefix | Audience | Rendering |
|---|---|---|---|
| Public web portal | `/` | Anyone (prospective parents, public) | SSR / prerendered — SEO matters |
| Parent & student portal | `/portal` | Parents, students | SPA (`ssr: false`) — auth-gated, no SEO |
| Administration portal | `/admin` | Staff: content editors, registrar, teachers | SPA (`ssr: false`) |

The admin portal is **both** the CMS for the public site **and** the operational back office for the portal (students, grades, attendance, fees). Those are two different permission worlds inside one UI — see §5.

### Portal v1 features
- Grades & report cards
- Attendance
- Fees / billing (read-only statement of account; **no payment gateway** in v1)

Deferred to v2: parent↔teacher messaging, online payments, admissions application workflow, class schedules/timetable.

## 2. Stack

**Frontend** — Nuxt 4, Tailwind CSS v4, Pinia, VueUse, `@nuxt/image`, Zod (shared schemas)
**Backend** — Node 22, Express 5, Drizzle ORM + `better-sqlite3`, Zod, argon2id, Pino
**DB** — SQLite (WAL mode, `foreign_keys=ON`)

### Note on Nuxt + Express

Nuxt ships Nitro, which could serve the API itself. You've specified Express, so the API is a **separate process** and Nitro is used only as the web server + dev proxy. That's a fine choice — clean separation, API independently testable and reusable — it just means two processes to run and deploy.

The one cost it usually creates, forwarding auth cookies from the SSR render to the API, is avoided entirely by making `/portal` and `/admin` client-rendered. Auth'd pages never render on the server, so there is no cookie-forwarding layer to get wrong.

```ts
// nuxt.config.ts
routeRules: {
  '/**':         { swr: 3600 },   // CMS-driven: cached, purged on publish
  '/preview/**': { ssr: true, cache: false, robots: false },
  '/portal/**':  { ssr: false },
  '/admin/**':   { ssr: false },
},
nitro: {
  devProxy: { '/api': { target: 'http://localhost:4000/api', changeOrigin: true } },
}
```

**Correction to draft v1:** that version had `'/': { prerender: true }`. That's wrong for this site — prerendering bakes the homepage at build time, so an editor publishing a new hero or announcement would see nothing change until the next deploy. Every public route is CMS-driven, so all of them are SWR with an explicit purge on publish. See `docs/release-1.md` §6.

In production the same `/api` → Express mapping is done by the reverse proxy (Caddy/nginx), so the browser only ever sees one origin. No CORS, no cross-site cookie problems.

## 3. Repo layout

```
School Website/
├─ package.json            # npm workspaces; scripts: dev / build / migrate / seed
├─ docs/architecture.md
├─ shared/                 # types + Zod schemas imported by BOTH web and api
│  └─ src/{roles.ts,grades.ts,attendance.ts,fees.ts,content.ts}
├─ web/                    # Nuxt 4
│  ├─ nuxt.config.ts
│  └─ app/
│     ├─ layouts/          default.vue · portal.vue · admin.vue
│     ├─ pages/
│     │  ├─ index.vue about/ academics/ admissions/ news/ events/ faculty/ contact.vue
│     │  ├─ portal/       index · grades · attendance · fees · profile
│     │  └─ admin/        content/ media/ students/ academics/ grades/ attendance/ fees/ users/ settings/
│     ├─ components/       ui/ · public/ · portal/ · admin/
│     ├─ composables/      useAuth · useApi · usePermissions
│     └─ middleware/       auth.global.ts · role.ts
└─ api/                    # Express 5
   ├─ data/school.db       # gitignored
   ├─ drizzle/             # generated migrations
   └─ src/
      ├─ index.ts app.ts
      ├─ db/               client.ts · schema/*.ts · seed.ts
      ├─ modules/          auth content media students academics grades attendance fees users
      │                    # each: *.routes.ts · *.service.ts · *.schema.ts
      ├─ middleware/       session · requireRole · scope · rateLimit · errorHandler
      └─ lib/              audit.ts · hash.ts · mailer.ts · ids.ts
```

Rule: **routes do HTTP, services do logic and own all DB access, schemas own validation.** No Drizzle queries inside route handlers.

## 4. Data model

SQLite, but written portably (no SQLite-only tricks) so a move to Postgres is a driver swap. Every table gets `created_at` / `updated_at`. IDs are ULIDs (`TEXT`) — sortable, safe to expose, no sequence leakage.

### Identity

```
users              id, email UNIQUE, password_hash, role, status(active|invited|disabled),
                   last_login_at
sessions           id(hashed opaque token), user_id, expires_at, ip, user_agent
invite_tokens      id, user_id, token_hash, expires_at, used_at
password_resets    id, user_id, token_hash, expires_at, used_at
audit_log          id, actor_user_id, action, entity, entity_id, before(JSON), after(JSON), ip, at
```

### School structure

```
school_years       id, name '2026–2027', start_date, end_date, is_active
semesters          id, school_year_id, seq(1|2), start_date, end_date
grading_periods    id, school_year_id, semester_id NULL, name 'Q1', seq,
                   start_date, end_date, is_locked
grade_levels       id, code 'G7', name 'Grade 7', seq, key_stage(KS1|KS2|KS3|KS4)
                   -- reference catalog: seeded with all of Kinder..G12, never edited
school_year_levels school_year_id, grade_level_id     -- which levels the school OFFERS
                   PRIMARY KEY(school_year_id, grade_level_id)
tracks             id, name 'Academic'|'TechPro'|'Arts & Design'|'Sports'   -- SHS only
strands            id, track_id, code 'STEM'|'ABM'|'HUMSS'|'GAS', name
sections           id, school_year_id, grade_level_id, strand_id NULL, name,
                   adviser_teacher_id
subjects           id, code UNIQUE, name, grade_level_id, subject_type
teachers           id, user_id, employee_no, first_name, last_name
class_offerings    id, school_year_id, semester_id NULL, section_id, subject_id, teacher_id
                   UNIQUE(section_id, subject_id, school_year_id, semester_id)
```

`class_offerings` is the spine — "this subject, taught to this section, by this teacher, this term". Grades and per-subject attendance both hang off it.

Three DepEd-specific shapes are baked in here:

- **`key_stage` on `grade_levels`** (KS1 = Kinder–G3, KS2 = G4–6, KS3 = G7–10, KS4 = G11–12). This drives which grading rule applies, and KS1 is a fundamentally different mode — see §4a.
- **`semester_id`, nullable.** SHS (G11–12) is semestral: subjects run one semester, not the school year, and a final grade averages 2 quarters instead of 4. Nullable means G1–10 ignores it entirely while SHS works correctly, with no second code path for terms.
- **`grade_levels` is a fixed catalog; `school_year_levels` is the school's configuration.** See §4b.

`subject_type` is the grading-weight discriminator, not decoration — see §4a.

### Students & guardians

```
students           id, lrn UNIQUE, student_no UNIQUE, user_id NULL,
                   last_name, first_name, middle_name, ext_name, birthdate, sex, address,
                   status(enrolled|transferred_in|transferred_out|graduated|inactive)
enrollments        id, student_id, school_year_id, section_id, status
                   UNIQUE(student_id, school_year_id)
guardian_links     id, guardian_user_id, student_id, relationship, is_primary
                   UNIQUE(guardian_user_id, student_id)
```

`guardian_links` is the entire basis of parent authorization. A parent sees exactly the students they are linked to — nothing else, ever.

### Grades

See §4a — DepEd grading is involved enough to need its own section.

### Attendance

```
attendance         id, student_id, date, class_offering_id NULL,
                   status(present|absent|late|excused), note, recorded_by
                   UNIQUE(student_id, date, class_offering_id)
```

`class_offering_id NULL` = homeroom/daily attendance. The nullable column lets v1 ship daily-only while the schema already supports per-subject later, with no migration.

### Fees

```
fee_items          id, school_year_id, grade_level_id NULL, name, amount, is_recurring
ledger_entries     id, student_id, school_year_id, type(charge|payment|adjustment),
                   fee_item_id NULL, amount, entry_date, reference_no, note, recorded_by
```

Append-only ledger. Balance = `SUM(charge) − SUM(payment) ± adjustments`. Corrections are new `adjustment` rows, never edits — that is what makes the money side auditable.

### CMS (public site content)

```
pages              id, slug UNIQUE, title, status(draft|published), published_at, seo(JSON)
page_blocks        id, page_id, seq, type, data(JSON)
posts              id, slug UNIQUE, title, excerpt, body, cover_media_id, category,
                   status, published_at, author_id
events             id, title, starts_at, ends_at, location, description, is_public
media              id, filename, storage_path, mime, size, width, height, alt, uploaded_by
navigation         id, location(header|footer), parent_id, label, url, seq
staff              id, name, role_title, photo_media_id, bio, department, seq
announcements      id, title, body, audience(public|portal|both), starts_at, ends_at
inquiries          id, name, email, phone, message, source, handled_by, handled_at
site_settings      key PK, value(JSON)
```

Block-based pages (`page_blocks` with a typed `data` JSON) rather than a rich-text blob — editors get Hero / Text / Image+Text / Cards / CTA / Gallery components, and the public site stays on-design because they cannot inject arbitrary HTML.

## 4a. DepEd grading (DO 015, s. 2026)

> **Source of truth warning.** The rules below were assembled from secondary summaries of **DepEd Order No. 015, s. 2026** (released 4 June 2026). Before Phase 5, transcribe the weights and the transmutation table from the **official DO PDF** and treat that as canon. Getting these numbers wrong produces plausible-looking grades that are quietly incorrect — the worst possible failure mode for this system.

DO 015 s. 2026 supersedes the long-standing DO 8, s. 2015 rules. It is a **phased transition**, which is the single most important fact for the design:

| School year | Rule |
|---|---|
| 2026–2027 (current) | Adjusted transmutation table. Initial Grade **70.00** transmutes to a passing **75**. |
| 2027–2028 onward | **Transmutation removed** for Grades 4–12. Raw 75 = term grade 75, zero-based. |

**Therefore: nothing about grading may be hardcoded.** Weights and transmutation are versioned rows keyed by school year. When SY 2027–2028 arrives, someone deletes a set of transmutation rows and the system is compliant — no code change, no redeploy, and last year's grades still recompute correctly under last year's rule.

### Component weights

**Key Stage 1 (Kinder–Grade 3): descriptive, non-numeric.** No numeric grades, no transmutation, no general average, no academic honors (Character Traits Awards instead). This is a separate feature, not a variant of the numeric one.

**Key Stages 2–3 (Grades 4–10):**

| Subject type | Written/Oral | Performance | Exam |
|---|---|---|---|
| Core (English, Filipino, Math, Science, AP, Values Ed) | 20% | 50% | 30% |
| Specialized (EPP/TLE, MAPEH) | 20% | 60% | 20% |

**Key Stage 4 (Grades 11–12):**

| Subject type | Written/Oral | Performance | Exam |
|---|---|---|---|
| Core & Academic Electives | 20% | 50% | 30% |
| Arts/Sports/Health Electives | 20% | 60% | 20% |
| TechPro Electives | 15% | 65% | 20% |
| Field Exposure, Arts Apprenticeship | 15% | 70% | 15% |
| Research & Design Innovation | 40% | 60% | — |
| Work Immersion | 20% | 80% | — |

Note the last two have **no exam component**. The schema must allow a zero exam weight without dividing by zero or silently redistributing.

### Schema

```
grading_schemes     id, school_year_id, key_stage, subject_type,
                    mode(numeric|descriptive),
                    ww_weight, pt_weight, exam_weight,   -- must sum to 100
                    policy_ref 'DO 015 s.2026'
                    UNIQUE(school_year_id, key_stage, subject_type)

transmutation_bands id, school_year_id, min_initial, max_initial, transmuted
                    -- zero rows for a school year == zero-based grading, no transmutation

assessments         id, class_offering_id, grading_period_id, component(ww|pt|exam),
                    title, highest_possible_score, given_on, is_formative
assessment_scores   id, assessment_id, student_id, raw_score, is_excused
                    UNIQUE(assessment_id, student_id)

period_grades       id, class_offering_id, student_id, grading_period_id,
                    ps_ww, ps_pt, ps_exam, initial_grade, transmuted_grade,
                    computed_at, locked_at
                    UNIQUE(class_offering_id, student_id, grading_period_id)

descriptive_marks   id, class_offering_id, student_id, grading_period_id,
                    domain, mark, narrative          -- KS1 only

value_statements    id, core_value(Maka-Diyos|Makatao|Makakalikasan|Makabansa), text, seq
value_marks         id, student_id, grading_period_id, value_statement_id,
                    mark(AO|SO|RO|NO)
```

`value_marks` covers the Observed Values block on the SF9 report card — easy to forget until a report card actually has to print.

### Computation pipeline

Implemented once, in `grades.service.ts`. Nowhere else.

1. **Percentage Score** per component: `Σ raw_score / Σ highest_possible_score × 100`. Exclude `is_formative` rows — DO 015 states formative assessment must not be used for grade computation. Exclude `is_excused` from **both** numerator and denominator.
2. **Weighted Score** = PS × the weight from `grading_schemes` for (year, key stage, subject type).
3. **Initial Grade** = Σ WS.
4. **Transmuted Grade** = lookup in `transmutation_bands` for that school year. **No rows → round the Initial Grade.** Implement as a literal transcribed lookup table, not a formula: I tried fitting a piecewise-linear formula to the published band anchors and it does not reproduce them cleanly. A formula that is right mid-range and wrong at the edges is worse than no formula.
5. **Final Grade** = mean of quarters — 4 for G4–10, 2 within the semester for G11–12.
6. **General Average** = mean of final grades across learning areas.

`period_grades` is a **snapshot**, written when a grading period locks. Report cards read the snapshot, never a live recomputation — so a later scheme edit or score correction can never silently rewrite a report card a parent already saw. Recomputation is an explicit, audited action.

### Promotion & awards

- Passing: 75. Below 75 in a learning area → flagged for remediation.
- Academic excellence (G4–12): general average ≥ 90 **and** no final grade below 80 **and** no derogatory record.
- KS1: no academic awards.

Encode these as values read from config, not `if` statements — DO 015 already proves these thresholds move.

## 4b. School configuration

The school decides in `/admin` which grade levels it offers, and whether SHS is enabled. That is a setup screen, not a code constant.

```
school_profile     key PK, value(JSON)
                   -- name, school_id, region, division, district, address, logo_media_id
```

### Offered levels are per school year, not global

`school_year_levels` is keyed by school year on purpose. A school that adds SHS in 2028 must not retroactively appear to have offered Grades 11–12 in 2026 — historical report cards, SF1s, and promotion reports all have to keep rendering the way the year actually was. A single global "offers SHS" flag silently corrupts every prior year the moment someone flips it.

`grade_levels` itself stays a **seeded reference catalog** of Kinder through Grade 12, never edited through the UI. `key_stage` is a DepEd fact, not a preference — letting an admin retype "Grade 7" or reassign its key stage would let them break grading in a way that surfaces months later, at report-card time.

### What the toggles gate

| Config | Effect when off |
|---|---|
| No KS4 levels offered | `semesters`, `tracks`, `strands`, SHS subject types and their six weight profiles are hidden throughout admin. Semester fields stay null. |
| No KS1 levels offered | Descriptive grading mode hidden; numeric is the only path. |
| KS1 offered | Descriptive mode required — see the sequencing note in §8. |

Implement as a single server-side `capabilities` object derived from the active school year and returned with the session, so admin nav, form validation, and the API all read one source. Do not scatter `if (shsEnabled)` through components — the UI hiding a field is cosmetic; the API rejecting the write is the actual rule.

### Setup wizard

First-run flow, because an empty install has no valid state: school profile → offered levels for the first school year → semesters (if KS4) → grading periods → seed `grading_schemes` + `transmutation_bands` for that year → sections → subjects → first admin user. Until it completes, the rest of admin stays locked. This also gives a clean path to standing up a fresh school year each June.

## 5. Roles & authorization

```
super_admin     everything
content_editor  CMS only — pages, posts, events, media, nav, staff. No student data at all.
registrar       students, enrollment, sections, fees, all grades (read), unlock periods
teacher         own class_offerings: enter grades, take attendance. Adviser: own section roster.
parent          linked students only, read-only
student         self only, read-only
```

**The rule that matters:** role checks gate the *route*; a scope check gates the *row*. Every service touching student data resolves an allowed student-id set for the caller before querying — `assertCanViewStudent(actor, studentId)`. Route-level `requireRole` alone is how portals leak other people's children.

Other invariants:

- Teachers cannot write grades for a `grading_period` where `is_locked = 1`. Only registrar unlocks, and the unlock is audited.
- Every write to `grade_entries` and `ledger_entries` writes an `audit_log` row in the same transaction.
- `content_editor` is deliberately walled off from student data — most CMS work is done by the person least in need of student records.

### Auth mechanics

- Admin-provisioned accounts. **No public signup anywhere.** Registrar creates the user, links it to a student or guardian record, and the system emails a single-use invite link.
- Opaque session token in an `httpOnly; Secure; SameSite=Lax` cookie; server-side `sessions` table so logout and account-disable are instant. Not a JWT in localStorage.
- argon2id for passwords. Rate-limit login by IP **and** by account. Generic failure messages.
- Password-reset and invite tokens: hashed at rest, single-use, short TTL.

Password auth for everyone — the school has no Workspace domain, so there's no SSO to lean on. Two consequences worth planning for:

- **Staff offboarding is manual.** With no directory to deactivate against, a departing teacher's grade-entry access is revoked only if someone remembers. Give the registrar a staff list filtered to `status = active` and make reviewing it a start-of-year checklist item alongside section setup.
- **Revisit if the school gets a Workspace domain.** Google sign-in (OIDC) for staff and students then becomes worthwhile, with parents staying on passwords. If built, restrict to the school's `hd` domain and still require a provisioned `users` row: Google would prove *who* someone is, never *what they may see*.
- No PII in URLs or query strings. Identifiers in paths are ULIDs, and every one is scope-checked regardless.

## 6. Operations

- **Concurrency:** SQLite in WAL mode handles a school comfortably — read-heavy workload, one writer at a time. The one burst is report-card release; keep grade writes in the service layer and transactions short.
- **Backups:** nightly `VACUUM INTO` to a timestamped file plus an offsite copy. Test a restore before go-live, not after.
- **Deploy:** single VPS. Caddy → Nuxt (`:3000`), `/api` → Express (`:4000`), both under systemd or PM2. SQLite file on local disk, never a network mount.
- **Migrations:** `drizzle-kit`-generated SQL, committed, applied on deploy. Never hand-edit an applied migration.
- **Escape hatch:** if the school outgrows SQLite, Drizzle plus portable SQL makes Postgres a driver-and-migrate job rather than a rewrite.

### Email delivery — free Gmail

**Decided: free `@gmail.com` via SMTP.** `smtp.gmail.com:587`, STARTTLS, App Password (requires 2FA on the sending account). No Workspace.

Email is a **Phase 1 dependency**, not a nicety: with no public signup, an invite email is the only way any account comes into existence. If mail is broken, nobody logs in. Free Gmail works, but it imposes two constraints the design has to absorb rather than discover in production.

#### Constraint 1: ~500 recipients/day, and rollout will blow through it

Initial invites go to every parent at once. A 600-student school is roughly 600–900 guardian accounts — comfortably over the daily cap. Sending them in a loop gets the account throttled, then temporarily suspended, partway through, leaving an unknowable subset of parents invited and no record of who.

So mail is **queued, never sent inline**:

```
outbox   id, to_email, template, payload(JSON), priority(transactional|bulk),
         status(queued|sending|sent|failed|dead), attempts, last_error,
         send_after, sent_at
```

A single worker drains it against a daily counter with exponential backoff. Two rules make it survive the cap:

- **Reserve transactional headroom.** Password resets and invites-on-demand are `transactional` and draw from a reserved slice (say 100/day). Bulk rollout is `bulk` and only consumes what's left. A parent resetting their password at 4pm must not fail because a bulk invite batch drained the quota at noon.
- **Stage the rollout by grade level.** ~300/day of bulk, one or two levels at a time, spread over a week. This is also better operationally — support load arrives in waves the office can actually handle, instead of every confused parent calling on the same morning.

Because sends are queued, the outbox doubles as the answer to "did Mrs. Santos ever get her invite?" — which the registrar will ask constantly during rollout.

#### Constraint 2: it looks like phishing

A password-reset link from a `@gmail.com` address is, to a careful parent, indistinguishable from an attack — and you cannot add SPF/DKIM for a domain you don't own. Mitigations, none of which fully solve it:

- Dedicated account (`schoolname.noreply@gmail.com`), never a staff member's personal Gmail, with the display name set to the school's full name.
- 2FA bound to a **school-owned** phone/number. If it's on the registrar's personal phone, mail dies the day they leave.
- Tell parents the exact sender address out-of-band — a printed slip at enrollment, or the existing announcement channel — *before* the first invite goes out.
- Every email states the school's real website URL in the body.

**Revisit when the school gets a domain.** They'll want one for the public site anyway, and Google Workspace for Education Fundamentals is free for accredited schools. That upgrade turns this section into a config change — swap the transport, raise the cap — because mail sits behind a `lib/mailer.ts` interface from day one. Build the interface now even though there's only one implementation.

#### Non-negotiable: no bulk announcements over email

Announcements live in the portal. Email carries account lifecycle only — invite, reset, address change. Blasting 900 parents through free Gmail will get the account suspended, and it will happen on the day a genuinely urgent notice needs to go out.

Dev transport writes `.eml` files to disk, so nobody needs live SMTP credentials to work on the app.

## 6a. DepEd forms & reporting

> **Scope boundary, state this to the school explicitly.** DepEd's official system of record is **LIS/EBEIS**. This system is *not* a replacement for it and does not submit anything to DepEd. It produces the forms for the school's own use, printing, and as a source to check against what gets entered into LIS. Registrars have been promised "DepEd-compliant" software before and reasonably assume it means submission. It does not.

You asked for what's necessary. Recommended split:

### In scope

| Form | What it is | Why it's necessary | Cost |
|---|---|---|---|
| **SF9** | Learner's Progress Report Card | The thing parents actually receive. The portal's grades view is a convenience; SF9 is the document. | Medium |
| **SF2** | Daily Attendance Report of Learners | Monthly, per section. We're already capturing daily attendance — this is a rendering job over data we have. | Low |
| **SF1** | School Register | Per-section enrollment roster at year start. Falls straight out of `enrollments`. | Low |
| **SF5** | Report on Promotion & Learning Progress | Year-end promotion list. Derives from final grades; closes the school-year loop that Phase 7 opens. | Medium |

SF2, SF1 and SF5 are cheap **specifically because** the data model already holds what they need. That's the argument for doing them in v1 rather than later — they're near-free now and become a data-backfill project if deferred.

### Deferred

**SF10 (Learner's Permanent Academic Record, ex-Form 137)** — legally required, but cumulative across a learner's entire history including years predating this system. Producing it for a Grade 9 student means having their Grades 1–8 records, which you won't have at launch. Capture the data faithfully from day one, defer the renderer to v2, and keep using whatever the registrar uses today for transferees.

**SF3, SF4, SF6, SF7, SF8** — books issued, monthly movement, summarized promotion, personnel, health/nutrition. Peripheral to a website and parent portal, and several need data this system has no other reason to hold. Skip unless the registrar names one as a live pain point.

### Implementation notes

- Render to **XLSX matching the current official template**, not a layout of our own. The registrar has to eyeball these against what DepEd expects, and a prettier custom layout actively hurts.
- **Verify the templates are current before building.** DO 015, s. 2026 changed grading substantially — removing transmutation, adding descriptive KS1 marks — and the forms that display grades were plausibly revised alongside it. Do not build SF9 against a template pulled from a 2018 blog post. Get current files from the school's own division office.
- Forms read from `period_grades` snapshots, never live recomputation — same rule as §4a. A printed SF9 and the portal must agree, permanently.

## 7. Public site pages (v1)

Home · About (mission, vision, history, message from the head) · Academics (per grade level / program) · Admissions (requirements, process, tuition summary, inquiry form) · News · Events & Calendar · Faculty & Staff · Downloads/Forms · Contact (map, hours, form) · Privacy Policy

All of these except Contact and the admissions inquiry form are CMS-driven `pages` + `page_blocks`.

## 8. Build order

| Phase | Deliverable |
|---|---|
| 0 | Workspace scaffold, Tailwind + design tokens, Drizzle schema, migration runner, seed script, error/logging conventions |
| 1 | Auth end-to-end: users, sessions, invite, reset, `requireRole`, `/admin` shell + login |
| 2 | CMS: media library, pages + block editor, posts, events, nav, settings |
| 3 | Public site consuming the CMS — full page set, SEO, sitemap, OG images, a11y pass |
| 4 | Setup wizard + SIS core: school profile, offered levels, semesters, sections, subjects, teachers, students, enrollment, guardian links |
| 5 | Grading engine: `grading_schemes` + `transmutation_bands` seeded from the official DO 015 PDF, computation pipeline, **golden-file tests**. No UI. |
| 6 | Teacher UIs: class record (assessments + scores), attendance taking, period locking, audit log |
| 7 | Report cards & forms: SF9, core values, general average, honors; then SF1, SF2, SF5 |
| 8 | Fees: fee items, ledger entry UI, statement of account |
| 9 | `/portal`: dashboard, grades/report card, attendance, fees, profile |
| 10 | Rollout tooling: bulk student import, staged invite batches, outbox monitoring |
| 11 | Hardening: authorization test suite, rate limits, backup/restore drill, UAT with real teachers during an actual grading period |
| 12 | KS1 descriptive grading — *only if the school offers Kinder–Grade 3* |

Three notes on the ordering:

**Phase 5 is deliberately split from Phase 6.** The grading engine is pure computation with no UI, so it can be verified against **golden files: real class records with the school's own hand-computed expected grades**. Get those from a registrar before writing the engine. It's the only way to actually know it's right, and far cheaper than finding a weighting bug in a report card a parent is already holding.

**Phase 12 is the honest cost of making grade levels configurable.** Since admin can enable Kinder–Grade 3, descriptive grading can't simply be dropped — but it's a genuinely separate feature (non-numeric, no averages, no honors, different report card), not a flag on the numeric one. Until it ships, the setup wizard should refuse to enable KS1 levels rather than accept them and produce nothing. If the school doesn't offer KS1, this phase disappears entirely — worth confirming early, since it's a phase of work either way.

**Phase 10 exists because of the Gmail cap.** Rollout is a multi-day staged operation, not a button. Building the tooling for it *before* hardening means the UAT in Phase 11 can run against real invited users.

Phases 1–3 ship a usable public website on their own — that's the natural first release, and it's worth putting live early rather than holding it behind the SIS work.

## 9. Decisions

### Settled

- One Nuxt app, three route groups; `/portal` and `/admin` client-rendered.
- Admin-provisioned accounts, no public signup.
- DepEd K-12. Grading per **DO 015, s. 2026**, with weights and transmutation stored as year-versioned data.
- **Offered grade levels and SHS are admin configuration**, per school year — see §4b.
- **Free Gmail SMTP**, with a queued outbox, reserved transactional quota, and staged rollout — see §6.
- **Forms: SF9, SF1, SF2, SF5 in scope. SF10 deferred. SF3/4/6/7/8 out** — see §6a.

### Still open

1. **Does the school offer Kinder–Grade 3?** Configurability means descriptive grading can't be dropped, only sequenced (Phase 12). Confirming a *no* removes a whole phase; confirming a *yes* means budgeting for it now.
2. **Are the official SF templates current post-DO 015?** Needs current files from the division office before Phase 7, not a template off a blog.
3. **Golden-file grade records.** Need real class records with hand-computed expected grades from a registrar before Phase 5. This is a dependency on the school, so ask early — it has the longest lead time of anything here.
4. **Existing data to migrate.** Student records, past grades, current website content. A bulk importer designed in at Phase 4 is cheap; retrofitted it is not.
5. **Student logins on day one, or parents only?** Schema supports both (`students.user_id` nullable) — a rollout and support-load question, not a technical one.
6. **Who operates this?** Backups, the Gmail account's 2FA, and the invite queue all need a named owner at the school. Worth settling before go-live rather than after the first failure.
