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
