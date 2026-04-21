export interface VadSegment {
  start: number
  end: number
}

export interface TranscribeChunk {
  text: string
  timestamp: [number, number]
}

export function mergeVadSegments(
  segments: VadSegment[],
  maxDurationS = 30,
  maxGapMs = 3000,
): VadSegment[] {
  if (segments.length === 0) return []

  const maxDurationMs = maxDurationS * 1000
  const merged: VadSegment[] = []
  let current: VadSegment = { start: segments[0].start, end: segments[0].end }

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i]
    const gap = seg.start - current.end
    const spanIfMerged = seg.end - current.start

    if (gap <= maxGapMs && spanIfMerged <= maxDurationMs) {
      current.end = seg.end
    } else {
      merged.push(current)
      current = { start: seg.start, end: seg.end }
    }
  }
  merged.push(current)

  return merged
}

export function offsetTimestamps(chunks: TranscribeChunk[], offsetS: number): TranscribeChunk[] {
  if (offsetS === 0) return chunks
  return chunks.map((chunk) => ({
    text: chunk.text,
    timestamp: [chunk.timestamp[0] + offsetS, chunk.timestamp[1] + offsetS] as [number, number],
  }))
}

export function sliceAudio(
  audio: Float32Array,
  startMs: number,
  endMs: number,
  sampleRate = 16000,
): Float32Array {
  const startSample = Math.floor((startMs / 1000) * sampleRate)
  const endSample = Math.ceil((endMs / 1000) * sampleRate)
  return audio.slice(Math.max(0, startSample), Math.min(audio.length, endSample))
}
