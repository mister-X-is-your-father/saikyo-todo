/**
 * iter1427 (queue タスク metadata 拡張 substrate): item の I/O & ゴール「言語化 completeness」
 * を判定する pure helper。
 *
 * 設計目的 (FEEDBACK_QUEUE.md タスク metadata 拡張):
 *   - 「タスクを作る時に『何が要るか / 何を出すか / 何のためか』を強制的に言語化させる」 (思考力)。
 *   - goal / input / output が定義されているかを集約し、未定義軸を nudge する chip を出す。
 *   - infer-dependencies.ts (output↔input 突合) の前段: そもそも I/O が書かれているか。
 *
 * AI 不使用・副作用無し。pure helper + Vitest 単体で網羅。
 */
export interface IoCompletenessInput {
  hasGoal: boolean
  inputCount: number
  outputCount: number
}

export interface IoCompleteness {
  /** 0-3 (goal + input>=1 + output>=1 を各 1 点) */
  score: number
  /** 未定義軸の日本語ラベル */
  missing: string[]
  /** 3 軸すべて定義済み */
  complete: boolean
}

export function assessIoCompleteness(input: IoCompletenessInput): IoCompleteness {
  const missing: string[] = []
  if (!input.hasGoal) missing.push('ゴール')
  if (input.inputCount <= 0) missing.push('インプット')
  if (input.outputCount <= 0) missing.push('アウトプット')
  const score = 3 - missing.length
  return { score, missing, complete: missing.length === 0 }
}

/**
 * chip / aria-label 用 1 行。
 *   'I/O 定義 完備 (3/3)'
 *   'I/O 定義 2/3 (未: アウトプット)'
 *   'I/O 未定義 (0/3)'
 */
export function formatIoCompletenessJa(c: IoCompleteness): string {
  if (c.complete) return 'I/O 定義 完備 (3/3)'
  if (c.score === 0) return 'I/O 未定義 (0/3)'
  return `I/O 定義 ${c.score}/3 (未: ${c.missing.join('・')})`
}

export function ioCompletenessTone(c: IoCompleteness): 'ok' | 'warn' | 'danger' {
  if (c.complete) return 'ok'
  if (c.score === 0) return 'danger'
  return 'warn'
}
