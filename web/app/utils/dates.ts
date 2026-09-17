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
