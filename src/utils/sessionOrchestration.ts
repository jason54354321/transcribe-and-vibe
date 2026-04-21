import type { Session } from '../composables/useSessionStore'

export function formatTranscriptionTimeDisplay(timeSec: number | null): string {
  if (timeSec === null) return ''
  if (timeSec < 60) return `${timeSec.toFixed(1)}s`
  const minutes = Math.floor(timeSec / 60)
  const seconds = timeSec % 60
  return `${minutes}m ${seconds.toFixed(0)}s`
}

export function prependTemporarySession(sessions: Session[], session: Session): Session[] {
  return [session, ...sessions]
}

export function removeSessionById(sessions: Session[], sessionId: string | null): Session[] {
  if (!sessionId) return sessions
  return sessions.filter((session) => session.id !== sessionId)
}

export function shouldShowStatus(
  isProcessing: boolean,
  activeSessionId: string | null,
  transcribingSessionId: string | null,
): boolean {
  return isProcessing && activeSessionId === transcribingSessionId
}

export function buildSessionRecord(
  sessionId: string,
  fileName: string,
  durationSec: number,
  transcriptionTimeSec?: number,
): Session {
  return {
    id: sessionId,
    name: fileName,
    createdAt: Date.now(),
    durationSec,
    transcriptionTimeSec,
  }
}
