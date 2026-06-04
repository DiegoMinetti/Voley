import { openDB, type DBSchema } from 'idb'
import type { MatchRecord, UserSettings } from '../types/models'

type MetaEntry = { key: string; value: string }
type SettingsEntry = { key: string; value: UserSettings }

interface VoleyDB extends DBSchema {
  matches: {
    key: string
    value: MatchRecord
  }
  meta: {
    key: string
    value: MetaEntry
  }
  settings: {
    key: string
    value: SettingsEntry
  }
}

const DB_NAME = 'voley-score-pwa'
const DB_VERSION = 1
const ACTIVE_MATCH_KEY = 'activeMatchId'
const SETTINGS_KEY = 'userSettings'

const dbPromise = openDB<VoleyDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('matches')) {
      db.createObjectStore('matches', { keyPath: 'id' })
    }
    if (!db.objectStoreNames.contains('meta')) {
      db.createObjectStore('meta', { keyPath: 'key' })
    }
    if (!db.objectStoreNames.contains('settings')) {
      db.createObjectStore('settings', { keyPath: 'key' })
    }
  },
})

export const saveMatch = async (match: MatchRecord): Promise<void> => {
  const db = await dbPromise
  await db.put('matches', match)
}

export const getMatch = async (id: string): Promise<MatchRecord | undefined> => {
  const db = await dbPromise
  return db.get('matches', id)
}

export const listMatches = async (): Promise<MatchRecord[]> => {
  const db = await dbPromise
  const all = await db.getAll('matches')
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export const setActiveMatchId = async (id: string | null): Promise<void> => {
  const db = await dbPromise

  if (id === null) {
    await db.delete('meta', ACTIVE_MATCH_KEY)
    return
  }

  await db.put('meta', { key: ACTIVE_MATCH_KEY, value: id })
}

export const getActiveMatchId = async (): Promise<string | null> => {
  const db = await dbPromise
  const entry = await db.get('meta', ACTIVE_MATCH_KEY)
  return entry?.value ?? null
}

export const saveUserSettings = async (settings: UserSettings): Promise<void> => {
  const db = await dbPromise
  await db.put('settings', { key: SETTINGS_KEY, value: settings })
}

export const getUserSettings = async (): Promise<UserSettings | null> => {
  const db = await dbPromise
  const entry = await db.get('settings', SETTINGS_KEY)
  return entry?.value ?? null
}

export const importMatches = async (matches: MatchRecord[]): Promise<void> => {
  const db = await dbPromise
  const tx = db.transaction('matches', 'readwrite')
  for (const match of matches) {
    await tx.store.put(match)
  }
  await tx.done
}
