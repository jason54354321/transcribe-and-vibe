export type Sentence = {
  startMs: number
  endMs: number
  startWordIndex: number
  endWordIndex: number
}

type Chunk = { text: string; timestamp: [number | null, number | null] }

const SENTENCE_END = /[.!?]["')\]]*\s*$/
const GAP_THRESHOLD_SEC = 0.8

export function buildSentences(chunks: Chunk[]): Sentence[] {
  const words = chunks.filter(
    (chunk) => chunk.timestamp[0] !== null && chunk.timestamp[1] !== null,
  )

  const sentences: Sentence[] = []
  let startIndex = 0

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const isLast = i === words.length - 1
    const endsWithPunctuation = SENTENCE_END.test(word.text)
    const next = words[i + 1]
    const gapTooBig =
      next != null && (next.timestamp[0] as number) - (word.timestamp[1] as number) > GAP_THRESHOLD_SEC

    if (endsWithPunctuation || gapTooBig || isLast) {
      const first = words[startIndex]
      sentences.push({
        startMs: Math.round((first.timestamp[0] as number) * 1000),
        endMs: Math.round((word.timestamp[1] as number) * 1000),
        startWordIndex: startIndex,
        endWordIndex: i,
      })
      startIndex = i + 1
    }
  }

  return sentences
}
