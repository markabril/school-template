/**
 * Stock photos used by `npm run seed:demo`. The image files themselves live in
 * api/data/demo-images/ (gitignored); only their descriptions are committed.
 * Licence: Unsplash License — https://unsplash.com/license
 */
export const PHOTO_ROLES = [
  'hero',
  'post-1',
  'post-2',
  'post-3',
  'post-4',
  'post-5',
  'post-6',
  'event-1',
  'event-2',
  'event-3',
  'history-1',
  'history-2',
  'staff-1',
  'staff-2',
  'staff-3',
  'staff-4',
  'staff-5',
  'staff-6',
] as const

export type PhotoRole = (typeof PHOTO_ROLES)[number]

export interface DemoPhoto {
  /** Describes exactly what this photo shows, for screen-reader users. */
  alt: string
  credit: string
  sourceUrl: string
}

export const photoFile = (role: PhotoRole): string => `${role}.jpg`

export const DEMO_PHOTOS: Record<PhotoRole, DemoPhoto> = {
  hero: {
    alt: 'A paved school plaza with a covered walkway, shade trees and multi-storey campus buildings under a pale sky.',
    credit: 'Photo by Wander Fleur on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/S1zLmRBgR6Q',
  },
  'post-1': {
    alt: 'A smiling teacher sits with pupils in batik uniforms in a bright classroom lined with bookshelves.',
    credit: 'Photo by Fiqih Alfarish on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/gc6MB1U0zgg',
  },
  'post-2': {
    alt: 'A young girl in a lab coat and safety goggles watches vapour pour from a dry-ice experiment.',
    credit: 'Photo by YY TEOH on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/WAEqUyi5CZQ',
  },
  'post-3': {
    alt: 'Two children chase a football across a green field lined with palm trees.',
    credit: 'Photo by Ahmed Nishaath on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/LhqoPs_0rTk',
  },
  'post-4': {
    alt: 'A woman and a young boy read a picture book together in front of library shelves.',
    credit: 'Photo by Adam Winger on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/7fF0iei80AQ',
  },
  'post-5': {
    alt: 'Volunteers with collection bags pick up debris along a wide sandy beach below green hills.',
    credit: 'Photo by Brian Yurasits on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/PzQNdXw2a6g',
  },
  'post-6': {
    alt: 'A young woman packs a cardboard box of donated goods in a storeroom.',
    credit: 'Photo by Rifki Kurniawan on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/n8K0RAJIp9A',
  },
  'event-1': {
    alt: 'Strings of colourful bunting flags stretched across a bright blue sky.',
    credit: 'Photo by Schiba on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/H_62TC-b598',
  },
  'event-2': {
    alt: 'A father and his daughter talk with a smiling teacher across a table by a window.',
    credit: 'Photo by Ana Rojas on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/GwpHi85G3Eo',
  },
  'event-3': {
    alt: 'Young children in yellow and white costumes perform together on an outdoor stage decorated with balloons.',
    credit: 'Photo by jason hu on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/3IcBQYa2xic',
  },
  'history-1': {
    alt: 'A white heritage building with a red roof and clock tower, framed by palm trees.',
    credit: 'Photo by Maxx Sas on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/6GsqltIg2g0',
  },
  'history-2': {
    alt: 'An empty classroom with rows of desks and tall windows looking out onto trees.',
    credit: 'Photo by Azzedine Rouichi on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/xem7fH68BCY',
  },
  'staff-1': {
    alt: 'Portrait of a smiling woman in a black blazer.',
    credit: 'Photo by Annika Palmari on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/RIt88XBR3G0',
  },
  'staff-2': {
    alt: 'Portrait of a man in a white shirt and tie with his arms crossed.',
    credit: 'Photo by Redd Francisco on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/pzOUnvx9c1E',
  },
  'staff-3': {
    alt: 'Portrait of a smiling woman with long dark hair outdoors.',
    credit: 'Photo by oktavianus mulyadi on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/W5l47gdGX2M',
  },
  'staff-4': {
    alt: 'Portrait of a man in a light blue denim shirt seated at a desk.',
    credit: 'Photo by Juan Encalada on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/WC7KIHo13Fc',
  },
  'staff-5': {
    alt: 'Portrait of a young woman wearing round glasses and a light shirt.',
    credit: 'Photo by Tai Ngo on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/vVIq9vb7RvI',
  },
  'staff-6': {
    alt: 'Portrait of a smiling man in a dark shirt.',
    credit: 'Photo by Afif Ramdhasuma on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/_XbueRj_pQM',
  },
}
