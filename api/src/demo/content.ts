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
