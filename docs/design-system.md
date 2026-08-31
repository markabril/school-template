# Design System — Cherished Moments School

Derived from the school crest. Companion to [release-1.md](release-1.md) §8.

> **Colors below are sampled by eye** from a 500×500 PNG with a white (not transparent) background. Before these are locked into tokens, I need the source file to sample exact values — see §6.

## 1. What the crest gives us

| Element | Meaning | Use on the site |
|---|---|---|
| Profile head + gears | **I THINK** | Academics |
| Laurel wreath | **I LEAD** | Student life, leadership, achievements |
| Hands holding globe | **I CARE** | Values, community, service |
| Gold tree, growing across all four quarters | Growth | Section motif, dividers, accents |
| "1990" | Heritage | About / history |

**The motto is the site's information architecture.** *I Think. I Lead. I Care.* is already three pillars, and the crest already contains an icon for each. Simplified line versions of those three marks become the icon set for the homepage triad and the top-level academics nav — which ties the site to the crest without ever needing decorative stock iconography.

## 2. Palette

| Token | Hex | Role |
|---|---|---|
| `--color-maroon` | `#6E1D2B` | Primary. Headers, primary buttons, links. |
| `--color-maroon-deep` | `#4E1420` | Hover/pressed, dark sections. |
| `--color-navy` | `#1B2545` | Secondary. Footer, alternate sections. |
| `--color-gold` | `#B4882B` | Accent — **decorative only**, see §3. |
| `--color-gold-ink` | `#8A6A20` | Accent as *text* on light backgrounds. |
| `--color-gold-light` | `#D9BC6A` | Accent as *text* on maroon/navy. |
| `--color-cream` | `#FAF7F2` | Page background. |
| `--color-ink` | `#1A1A1A` | Body text. |

Maroon and navy both come off the crest's quartered shield; gold is the tree. Cream rather than pure white — the crest reads warm, and white makes the maroon look harsher than it is.

## 3. Contrast — checked before committing, not after

Measured against WCAG 2.1 AA (4.5:1 body, 3:1 large text and UI):

| Pair | Ratio | Verdict |
|---|---|---|
| Maroon on white/cream | ~10.2:1 | ✅ AAA |
| Navy on white/cream | ~14:1 | ✅ AAA |
| Cream on maroon | ~10.6:1 | ✅ AAA |
| Gold-light `#D9BC6A` on maroon | ~6.1:1 | ✅ AA |
| Gold-ink `#8A6A20` on white | ~5.0:1 | ✅ AA |
| **Gold `#B4882B` on white** | **~3.1:1** | ❌ **fails AA body text** — large text and UI only |
| **Gold `#B4882B` on maroon** | **~3.6:1** | ❌ **fails AA body text** — large text only |

**The rule that falls out:** the crest's gold is a *decorative* color — rules, borders, icon fills, large display numerals, and the tree motif. It is never body text, never small labels, never link text on a light background. When gold needs to carry words, it becomes `gold-ink` on light or `gold-light` on dark.

This is the single constraint most likely to be violated later by someone matching the logo by eye, so it belongs in the token names themselves rather than in a style guide nobody reopens.

## 4. Typography

**One webfont, deliberately.** Most parents will load this on mobile data on a mid-range Android (release-1.md §8). A second family costs 30–40KB of render-blocking weight for a difference nobody notices on a 360px viewport.

- **Headings — Fraunces Variable, self-hosted.** *(Decided and implemented.)* Installed via `@fontsource-variable/fraunces`, importing only the `wght` axis. Self-hosted rather than linked from Google: no third-party request on a school's public site, and no dependency on a CDN the school does not control. The optical-size axis would be lovely but doubles the payload for a difference invisible at the sizes actually used.

  **Measured cost: 36,620 bytes.** Three subsets are declared (latin, latin-ext, vietnamese) but `unicode-range` means an English page downloads only latin. `font-display: swap`, so headings render immediately in Georgia and reflow once rather than sitting invisible on a slow connection.
- **Body — system stack.** `-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. Zero bytes, renders instantly, and at body sizes on a phone it is indistinguishable from a licensed humanist sans.

Fluid scale via `clamp()`, ratio 1.200 mobile → 1.250 desktop. Body 16px minimum — never smaller, regardless of what looks tidy in a desktop mockup.

## 5. Logo usage

**The crest does not work at header size.** At the ~40–48px height a sticky header allows, the gears, the face profile, the laurel, and both banner texts collapse into an unreadable smudge. This is not a flaw in the crest — it was drawn for a letterhead and a gate sign, where it's excellent.

Recommended system:

| Mark | Where |
|---|---|
| **Full crest** | Footer, About page, print, documents, report cards (Release 2) |
| **Simplified mark** — shield outline + gold tree only, no interior icons, no banners | Header, mobile nav, social avatars |
| **Monogram / favicon** — shield silhouette or "CMS" | Favicon, app icon, 16–32px contexts |

The simplified mark needs drawing; budget it into the design pass. It is not optional — the alternative is a header logo nobody can read, which every visitor sees on every page.

Also specify: minimum sizes, clear space (½ shield width on all sides), and approved backgrounds (cream, white, maroon, navy — never on a photo without a scrim).

## 6. What I need

1. **Vector source** — SVG, AI, EPS, or PDF. The PNG supplied is 500px on a white background; scaling it for a hero or print will show. If no vector exists, redrawing the crest is a real but worthwhile one-time task, and it's what makes the simplified mark and favicon possible.
2. **Transparent-background export** at minimum, if vector genuinely doesn't exist.
3. **Confirmation of the school's official colors**, if they've ever been written down. My hexes are sampled from a compressed raster and the crest has shading — the "real" maroon may be a specified value the school already uses on uniforms and letterhead.
