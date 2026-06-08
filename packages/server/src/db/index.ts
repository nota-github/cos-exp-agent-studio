import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { MIGRATIONS } from './schema.js'

const DB_DIR = join(homedir(), '.agent-studio')
const DB_PATH = join(DB_DIR, 'db.sqlite')

mkdirSync(DB_DIR, { recursive: true })

const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

function applyMigrations(): void {
  const currentVersion = db.pragma('user_version', { simple: true }) as number

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      const apply = db.transaction(() => {
        for (const statement of migration.statements) {
          db.prepare(statement).run()
        }
        db.pragma(`user_version = ${migration.version}`)
      })
      apply()
      console.log(`[db] Applied migration v${migration.version}`)
    }
  }
}

applyMigrations()

function closeDb(): void {
  db.close()
  console.log('[db] Database connection closed')
}

export { db, DB_PATH, closeDb }
