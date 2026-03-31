import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { TranscribeResult } from './useTranscriber'
import { createLogger } from '../utils/logger'

const log = createLogger('SessionStore')

export type Session = {
  id: string
  name: string
  createdAt: number
  durationSec: number
  transcriptionTimeSec?: number
}

interface VibeSessionDB extends DBSchema {
  sessions: {
    key: string
    value: Session
    indexes: { 'by-createdAt': number }
  }
  sessionBlobs: {
    key: string
    value: Blob
  }
  sessionTranscripts: {
    key: string
    value: TranscribeResult
  }
}

const DB_NAME = 'vibe-sessions'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<VibeSessionDB>> | null = null

function getDB(): Promise<IDBPDatabase<VibeSessionDB>> {
  if (!dbPromise) {
    dbPromise = openDB<VibeSessionDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' })
        sessionStore.createIndex('by-createdAt', 'createdAt')
        db.createObjectStore('sessionBlobs')
        db.createObjectStore('sessionTranscripts')
      },
    })
  }
  return dbPromise
}

export async function saveSession(
  session: Session,
  audioBlob: Blob,
  transcript: TranscribeResult,
): Promise<void> {
  log.info(`Saving session ${session.id} "${session.name}"`)
  const db = await getDB()
  // Deep-clone transcript to strip Vue reactive proxies (not structured-clonable)
  const plainTranscript: TranscribeResult = JSON.parse(JSON.stringify(transcript))
  const tx = db.transaction(['sessions', 'sessionBlobs', 'sessionTranscripts'], 'readwrite')
  await Promise.all([
    tx.objectStore('sessions').put(session),
    tx.objectStore('sessionBlobs').put(audioBlob, session.id),
    tx.objectStore('sessionTranscripts').put(plainTranscript, session.id),
    tx.done,
  ])
  log.info(`Session saved ${session.id}`)
}

export async function listSessions(): Promise<Session[]> {
  const db = await getDB()
  const sessions = await db.getAllFromIndex('sessions', 'by-createdAt')
  return sessions.reverse()
}

export async function loadSessionData(
  id: string,
): Promise<{ audioBlob: Blob; transcript: TranscribeResult } | null> {
  log.info(`Loading session ${id}`)
  const db = await getDB()
  const tx = db.transaction(['sessionBlobs', 'sessionTranscripts'], 'readonly')
  const [audioBlob, transcript] = await Promise.all([
    tx.objectStore('sessionBlobs').get(id),
    tx.objectStore('sessionTranscripts').get(id),
  ])
  if (!audioBlob || !transcript) return null
  return { audioBlob, transcript }
}

export async function deleteSession(id: string): Promise<void> {
  log.info(`Deleting session ${id}`)
  const db = await getDB()
  const tx = db.transaction(['sessions', 'sessionBlobs', 'sessionTranscripts'], 'readwrite')
  await Promise.all([
    tx.objectStore('sessions').delete(id),
    tx.objectStore('sessionBlobs').delete(id),
    tx.objectStore('sessionTranscripts').delete(id),
    tx.done,
  ])
}
