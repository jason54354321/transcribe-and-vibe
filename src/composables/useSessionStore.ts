import type { TranscribeResult } from '../types/transcriber'
import { createLogger } from '../utils/logger'

const log = createLogger('SessionStore')

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api'

export type Session = {
  id: string
  name: string
  createdAt: number
  durationSec: number
  transcriptionTimeSec?: number
}

export async function saveSession(
  session: Session,
  audioBlob: Blob,
  transcript: TranscribeResult,
): Promise<void> {
  log.info(`Saving session ${session.id} "${session.name}"`)
  const plainTranscript: TranscribeResult = JSON.parse(JSON.stringify(transcript))
  const form = new FormData()
  form.append('audio', audioBlob)
  form.append('id', session.id)
  form.append('name', session.name)
  form.append('duration_sec', String(session.durationSec))
  form.append('transcript', JSON.stringify(plainTranscript))
  if (session.transcriptionTimeSec != null) {
    form.append('transcription_time_sec', String(session.transcriptionTimeSec))
  }

  const res = await fetch(`${API_BASE}/sessions`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Failed to save session ${session.id}: ${res.status}`)
  log.info(`Session saved ${session.id}`)
}

export async function listSessions(): Promise<Session[]> {
  const res = await fetch(`${API_BASE}/sessions`)
  if (!res.ok) throw new Error(`Failed to list sessions: ${res.status}`)
  return (await res.json()) as Session[]
}

export async function loadSessionData(
  id: string,
): Promise<{ audioUrl: string; transcript: TranscribeResult } | null> {
  log.info(`Loading session ${id}`)
  const res = await fetch(`${API_BASE}/sessions/${id}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to load session ${id}: ${res.status}`)
  const data = (await res.json()) as { session: Session; transcript: TranscribeResult }
  return { audioUrl: `${API_BASE}/sessions/${id}/audio`, transcript: data.transcript }
}

export async function deleteSession(id: string): Promise<void> {
  log.info(`Deleting session ${id}`)
  const res = await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete session ${id}: ${res.status}`)
}
