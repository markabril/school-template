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

// ---- Task 13: inner pages --------------------------------------------------

check('/news', 'category chips with "All" current', (h) => {
  const nav = between(h, 'aria-label="News categories"', '</nav>')
  return /aria-current="page"[^>]*>\s*All\s*</.test(nav) && nav.includes('Student Life')
})

// At least: the demo seeds 9 articles, but a dev database may already hold its own.
check('/news', 'first page: one large featured card, then standard cards', (h) =>
  count(h, /data-news-card="large"/) === 1 && count(h, /data-news-card="standard"/) >= 8,
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

check('/staff', 'at least the six demo staff, as portrait cards', (h) => count(h, /data-staff-card/) >= 6 && h.includes('aspect-[4/5]'))

check('/downloads', 'downloads page has the band and the sample files', (h) =>
  h.includes('data-page-header') && h.includes('Enrolment Form (sample)'),
)

check('/contact', 'contact details sit in a maroon panel beside the form', (h) =>
  /data-contact-panel[^>]*class="[^"]*bg-maroon/.test(h) && h.includes('(02) 8123 4567') && h.includes('Your name'),
)

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
