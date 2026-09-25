/**
 * Structural accessibility audit over the server-rendered HTML of every public
 * page. Not a substitute for a screen-reader pass, but it catches the things
 * that are objectively checkable and easy to regress.
 */
const BASE = 'http://127.0.0.1:3100'
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

let problems = 0
const report = (page, level, msg) => {
  if (level === 'FAIL') problems++
  console.log(`  ${level === 'FAIL' ? 'FAIL' : level === 'WARN' ? 'WARN' : 'ok  '}  ${page}  ${msg}`)
}

/** Strip <script> and <style> contents so their text is not treated as markup. */
function strip(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
}

function tags(html, name) {
  const re = new RegExp(`<${name}\\b([^>]*)>`, 'gi')
  const out = []
  let m
  while ((m = re.exec(html))) out.push(m[1] ?? '')
  return out
}

function attr(tag, name) {
  // Anchored on whitespace, or `data-alt="…"` would be read as `alt`.
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'i'))
  if (m) return m[1]
  // A valueless attribute is an empty value, not a missing one — Vue renders
  // alt="" that way, and `<img alt>` is a correctly marked decorative image
  // rather than one with no alt at all.
  return new RegExp(`\\s${name}(\\s|>|$)`, 'i').test(tag) ? '' : null
}

for (const path of PAGES) {
  const res = await fetch(BASE + path)
  const raw = await res.text()
  const html = strip(raw)

  if (res.status !== 200) {
    report(path, 'FAIL', `HTTP ${res.status}`)
    continue
  }

  // --- lang ---------------------------------------------------------------
  const htmlTag = tags(raw, 'html')[0] ?? ''
  attr(htmlTag, 'lang')
    ? report(path, 'ok', 'html[lang] present')
    : report(path, 'FAIL', 'html element has no lang attribute')

  // --- single h1 ----------------------------------------------------------
  const h1s = tags(html, 'h1').length
  if (h1s === 1) report(path, 'ok', 'exactly one h1')
  else report(path, 'FAIL', `expected 1 h1, found ${h1s}`)

  // --- heading order (no skipped levels) ----------------------------------
  const levels = [...html.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]))
  let skipped = null
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) {
      skipped = `h${levels[i - 1]} -> h${levels[i]}`
      break
    }
  }
  skipped
    ? report(path, 'FAIL', `heading level skipped (${skipped})`)
    : report(path, 'ok', `heading order sound [${levels.join(',')}]`)

  // --- landmarks ----------------------------------------------------------
  const hasMain = /<main\b/i.test(html)
  const hasNav = /<nav\b/i.test(html)
  const hasFooter = /<footer\b/i.test(html)
  hasMain ? report(path, 'ok', 'has <main>') : report(path, 'FAIL', 'no <main> landmark')
  if (!hasNav) report(path, 'WARN', 'no <nav> landmark')
  if (!hasFooter) report(path, 'WARN', 'no <footer> landmark')

  // --- skip link ----------------------------------------------------------
  ;(/class="skip-link"/).test(html)
    ? report(path, 'ok', 'skip link present')
    : report(path, 'FAIL', 'no skip link')

  // --- images have alt ----------------------------------------------------
  const imgs = tags(html, 'img')
  const noAlt = imgs.filter((t) => attr(t, 'alt') === null)
  noAlt.length === 0
    ? report(path, 'ok', `${imgs.length} image(s), all with alt`)
    : report(path, 'FAIL', `${noAlt.length} image(s) missing alt`)

  // --- images reserve space (no layout shift) -----------------------------
  const contentImgs = imgs.filter((t) => (attr(t, 'alt') ?? '') !== '')
  const noDims = contentImgs.filter((t) => !attr(t, 'width') || !attr(t, 'height'))
  if (contentImgs.length) {
    noDims.length === 0
      ? report(path, 'ok', 'content images declare width/height')
      : report(path, 'WARN', `${noDims.length} image(s) without width/height (layout shift)`)
  }

  // --- form controls are labelled -----------------------------------------
  const inputs = [...tags(html, 'input'), ...tags(html, 'textarea'), ...tags(html, 'select')]
  const visible = inputs.filter((t) => (attr(t, 'type') ?? '') !== 'hidden')
  const ids = visible.map((t) => attr(t, 'id')).filter(Boolean)
  const labelFor = [...html.matchAll(/<label[^>]*for="([^"]*)"/gi)].map((m) => m[1])
  const unlabelled = visible.filter((t) => {
    if (attr(t, 'aria-label') || attr(t, 'aria-labelledby')) return false
    const id = attr(t, 'id')
    return !id || !labelFor.includes(id)
  })
  if (visible.length) {
    unlabelled.length === 0
      ? report(path, 'ok', `${visible.length} form control(s), all labelled`)
      : report(path, 'FAIL', `${unlabelled.length} unlabelled form control(s)`)
  }

  // --- buttons and links have accessible names ----------------------------
  const emptyLinks = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].filter(([, a, inner]) => {
    if (attr(a, 'aria-label')) return false
    return inner.replace(/<[^>]*>/g, '').trim() === '' && !/<img/i.test(inner)
  })
  emptyLinks.length === 0
    ? report(path, 'ok', 'no empty links')
    : report(path, 'FAIL', `${emptyLinks.length} link(s) with no accessible name`)

  // --- canonical + title --------------------------------------------------
  ;(/<link[^>]+rel="canonical"/i).test(raw)
    ? report(path, 'ok', 'canonical URL set')
    : report(path, 'FAIL', 'no canonical link')
  const title = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()
  title ? report(path, 'ok', `title: "${title}"`) : report(path, 'FAIL', 'no <title>')
  console.log('')
}

console.log(problems === 0 ? 'No failures.' : `${problems} failure(s).`)
process.exit(problems === 0 ? 0 : 1)
