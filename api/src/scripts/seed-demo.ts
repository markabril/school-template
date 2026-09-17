import path from 'node:path'
import { closeDb } from '../db/client.js'
import { removeDemo, seedDemo } from '../demo/seed.js'

/**
 *   npm run seed:demo                 fill the site with demo content
 *   npm run seed:demo -- --remove     remove exactly that content
 */
const remove = process.argv.includes('--remove')

try {
  if (remove) {
    await removeDemo()
    console.log('Demo content removed; previous homepage, navigation and settings restored.')
  } else {
    const ids = await seedDemo({ imagesDir: path.resolve('data/demo-images') })
    console.log(
      `Demo content created: ${ids.media.length} media, ${ids.posts.length} posts, ` +
        `${ids.events.length} events, ${ids.staff.length} staff, ${ids.downloads.length} downloads, ` +
        `${ids.pages.length} pages.`,
    )
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
} finally {
  closeDb()
}
