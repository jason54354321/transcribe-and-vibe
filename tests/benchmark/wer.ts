/**
 * Word Error Rate (WER) calculation using dynamic programming.
 * Standard ASR evaluation metric: WER = (S + D + I) / N
 * where S = substitutions, D = deletions, I = insertions, N = reference word count.
 */

export type WerResult = {
  wer: number
  substitutions: number
  deletions: number
  insertions: number
  referenceWords: number
  hypothesisWords: number
}

/**
 * Normalize text for WER comparison:
 * - Lowercase
 * - Remove punctuation
 * - Collapse whitespace
 * - Trim
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Compute Word Error Rate between hypothesis and reference.
 * Both strings are normalized before comparison.
 */
export function computeWER(hypothesis: string, reference: string): WerResult {
  const hypWords = normalizeText(hypothesis).split(' ').filter(Boolean)
  const refWords = normalizeText(reference).split(' ').filter(Boolean)

  const n = refWords.length
  const m = hypWords.length

  if (n === 0) {
    return {
      wer: m === 0 ? 0 : 1,
      substitutions: 0,
      deletions: 0,
      insertions: m,
      referenceWords: 0,
      hypothesisWords: m,
    }
  }

  // DP matrix for edit distance
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))

  for (let i = 0; i <= n; i++) dp[i][0] = i
  for (let j = 0; j <= m; j++) dp[0][j] = j

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (refWords[i - 1] === hypWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1, // substitution
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
        )
      }
    }
  }

  // Backtrace to count S, D, I
  let i = n
  let j = m
  let substitutions = 0
  let deletions = 0
  let insertions = 0

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && refWords[i - 1] === hypWords[j - 1]) {
      i--
      j--
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      substitutions++
      i--
      j--
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      deletions++
      i--
    } else {
      insertions++
      j--
    }
  }

  return {
    wer: dp[n][m] / n,
    substitutions,
    deletions,
    insertions,
    referenceWords: n,
    hypothesisWords: m,
  }
}

/**
 * Compute average WER across multiple samples.
 */
export function computeAverageWER(results: WerResult[]): WerResult {
  if (results.length === 0) {
    return {
      wer: 0,
      substitutions: 0,
      deletions: 0,
      insertions: 0,
      referenceWords: 0,
      hypothesisWords: 0,
    }
  }

  const totals = results.reduce(
    (acc, r) => ({
      substitutions: acc.substitutions + r.substitutions,
      deletions: acc.deletions + r.deletions,
      insertions: acc.insertions + r.insertions,
      referenceWords: acc.referenceWords + r.referenceWords,
      hypothesisWords: acc.hypothesisWords + r.hypothesisWords,
    }),
    { substitutions: 0, deletions: 0, insertions: 0, referenceWords: 0, hypothesisWords: 0 },
  )

  return {
    wer:
      totals.referenceWords > 0
        ? (totals.substitutions + totals.deletions + totals.insertions) / totals.referenceWords
        : 0,
    ...totals,
  }
}
