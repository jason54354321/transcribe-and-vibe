import { createLogger } from '../utils/logger'

export const MAX_FILE_SIZE = 100 * 1024 * 1024
export const VALID_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/ogg', 'audio/mp4', 'audio/x-wav', 'audio/aac']

export function useFileUpload() {
  const log = createLogger('FileUpload')

  const handleFile = async (file: File): Promise<{
    audioUrl: string
    audioData: Float32Array
    audioBlob: Blob
    durationSec: number
  }> => {
    if (!VALID_TYPES.includes(file.type) && !file.type.startsWith('audio/')) {
      throw new Error(`Invalid file type: ${file.type}. Please upload audio.`)
    }
    
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("File too large. Maximum size is 100MB.")
    }

    log.info(`Processing "${file.name}" (${file.type}, ${(file.size / 1024 / 1024).toFixed(1)}MB)`)

    const audioUrl = URL.createObjectURL(file)
    const arrayBuffer = await file.arrayBuffer()
    
    const audioContext = new AudioContext({ sampleRate: 16000 })
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const audioData = audioBuffer.getChannelData(0)
      log.info(`Audio decoded (${audioBuffer.duration.toFixed(1)}s, ${audioData.length} samples)`)
      return { audioUrl, audioData, audioBlob: file, durationSec: audioBuffer.duration }
    } finally {
      audioContext.close()
    }
  }

  return {
    handleFile,
    MAX_FILE_SIZE,
    VALID_TYPES
  }
}
