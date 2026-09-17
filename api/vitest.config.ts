import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // better-sqlite3 is a native module; forks isolate it cleanly per file.
    pool: 'forks',
    setupFiles: ['./test/setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_PATH: ':memory:',
      MEDIA_DIR: './test/.tmp-media',
      LOG_LEVEL: 'silent',
      PUBLIC_ORIGIN: 'http://localhost:3100',
      // Port 9 (discard) refuses connections immediately, so fire-and-forget
      // cache purges fail fast instead of hanging a test.
      REVALIDATE_URL: 'http://127.0.0.1:9/__revalidate',
      REVALIDATE_SECRET: 'test-revalidate-secret',
      SECRET_KEY: 'test-secret-key-value',
      MAIL_TRANSPORT: 'file',
    },
  },
})
