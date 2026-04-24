import { computed, ref, watch } from 'vue'
import type { ComputedRef, Ref, WritableComputedRef } from 'vue'
import { deleteSession, listSessions, loadSessionData, saveSession } from './useSessionStore'
import type { Session } from './useSessionStore'
import type { TranscribeResult } from '../types/transcriber'
import { createLogger } from '../utils/logger'
import { buildSessionRecord, removeSessionById } from '../utils/sessionOrchestration'

type SessionOrchestrationArgs = {
  transcriberResult: Ref<TranscribeResult | null>
  transcriberError: Ref<string | null>
  displayedResult: Ref<TranscribeResult | null>
  isProcessing: Ref<boolean>
  transcriptionTimeSec: Ref<number | null>
  audioUrl: Ref<string>
  revokeAudioUrl: () => void
}

export function useSessionOrchestration(args: SessionOrchestrationArgs) {
  const log = createLogger('SessionOrchestration')
  const sessions = ref<Session[]>([])
  const activeSessionId = ref<string | null>(null)
  const audioBlob = ref<Blob | null>(null)
  const fileName = ref('')
  const durationSec = ref(0)
  const transcribingSessionId = ref<string | null>(null)
  const transcribingBlob = ref<Blob | null>(null)
  const transcribingFileName = ref('')
  const transcribingDuration = ref(0)
  const viewedTranscript = ref<TranscribeResult | null>(null)
  const displayTranscriptionTime = ref<number | null>(null)

  const showStatus = computed(
    () => args.isProcessing.value && activeSessionId.value === transcribingSessionId.value,
  )

  const initializeSessions = async () => {
    sessions.value = await listSessions()
    log.info(`Loaded ${sessions.value.length} session(s)`)
  }

  const startTranscriptionSession = (sessionId: string, nextFileName: string) => {
    activeSessionId.value = sessionId
    transcribingSessionId.value = sessionId
    fileName.value = nextFileName
    transcribingFileName.value = nextFileName
    viewedTranscript.value = null
    displayTranscriptionTime.value = null
  }

  const setCurrentAudio = (nextUrl: string, blob: Blob, duration: number) => {
    args.audioUrl.value = nextUrl
    audioBlob.value = blob
    durationSec.value = duration
    transcribingBlob.value = blob
    transcribingDuration.value = duration
  }

  const addTemporarySession = (sessionId: string, nextFileName: string, duration: number) => {
    sessions.value = [buildSessionRecord(sessionId, nextFileName, duration), ...sessions.value]
  }

  const handleTranscriptionStartFailure = (sessionId: string) => {
    sessions.value = removeSessionById(sessions.value, sessionId)
    transcribingSessionId.value = null
    transcribingBlob.value = null
  }

  const resetCurrentView = () => {
    activeSessionId.value = null
    audioBlob.value = null
    args.displayedResult.value = null
    args.transcriberError.value = null
    fileName.value = ''
    durationSec.value = 0
    displayTranscriptionTime.value = null
  }

  const clearTransientErrors = () => {
    args.transcriberError.value = null
  }

  const onSessionSelect = async (id: string, clearAppError: () => void) => {
    if (id === activeSessionId.value) return

    if (args.isProcessing.value && id === transcribingSessionId.value) {
      args.revokeAudioUrl()
      activeSessionId.value = id
      args.displayedResult.value = null
      args.audioUrl.value = URL.createObjectURL(transcribingBlob.value!)
      audioBlob.value = transcribingBlob.value
      fileName.value = transcribingFileName.value
      durationSec.value = transcribingDuration.value
      viewedTranscript.value = null
      displayTranscriptionTime.value = null
      clearTransientErrors()
      clearAppError()
      return
    }

    log.info(`Session selected: ${id}`)
    const data = await loadSessionData(id)
    if (!data) return

    const session = sessions.value.find((item) => item.id === id)
    args.revokeAudioUrl()
    activeSessionId.value = id
    args.displayedResult.value = data.transcript
    viewedTranscript.value = data.transcript
    args.audioUrl.value = URL.createObjectURL(data.audioBlob)
    audioBlob.value = data.audioBlob
    fileName.value = session?.name ?? ''
    durationSec.value = session?.durationSec ?? 0
    displayTranscriptionTime.value = session?.transcriptionTimeSec ?? null
    clearTransientErrors()
    clearAppError()
  }

  const onSessionDelete = async (id: string, clearAppError: () => void) => {
    if (id === transcribingSessionId.value) return

    log.info(`Session deleted: ${id}`)
    await deleteSession(id)
    sessions.value = await listSessions()

    if (activeSessionId.value === id) {
      args.revokeAudioUrl()
      resetCurrentView()
      clearAppError()
    }
  }

  const onNewSession = (clearAppError: () => void) => {
    if (args.isProcessing.value) return

    args.revokeAudioUrl()
    resetCurrentView()
    clearAppError()
    log.info('New session')
  }

  watch(args.isProcessing, async (processing, wasProcessing) => {
    if (!wasProcessing || processing) return

    if (args.transcriberResult.value && transcribingBlob.value && transcribingSessionId.value) {
      const transcriptToSave = args.transcriberResult.value
      const savedSessionId = transcribingSessionId.value

      if (activeSessionId.value === savedSessionId) {
        args.displayedResult.value = transcriptToSave
        displayTranscriptionTime.value = args.transcriptionTimeSec.value
      }

      if (activeSessionId.value !== savedSessionId && viewedTranscript.value) {
        args.displayedResult.value = viewedTranscript.value
      }

      try {
        const session = buildSessionRecord(
          savedSessionId,
          transcribingFileName.value,
          transcribingDuration.value,
          args.transcriptionTimeSec.value ?? undefined,
        )
        log.info(`Auto-saving session ${savedSessionId}`)
        await saveSession(session, transcribingBlob.value, transcriptToSave)
        sessions.value = await listSessions()
      } catch (err: unknown) {
        log.error('Failed to save session', err)
      }
    } else if (transcribingSessionId.value) {
      sessions.value = removeSessionById(sessions.value, transcribingSessionId.value)
    }

    transcribingSessionId.value = null
    transcribingBlob.value = null
  })

  return {
    sessions,
    activeSessionId,
    audioBlob,
    fileName,
    durationSec,
    transcribingSessionId,
    transcribingBlob,
    transcribingFileName,
    transcribingDuration,
    viewedTranscript,
    displayTranscriptionTime,
    showStatus,
    initializeSessions,
    startTranscriptionSession,
    setCurrentAudio,
    addTemporarySession,
    handleTranscriptionStartFailure,
    onSessionSelect,
    onSessionDelete,
    onNewSession,
  }
}
