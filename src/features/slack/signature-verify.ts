/**
 * iter (queue Slack ワンポチ substrate): Slack 受信 webhook の signature verification pure 関数。
 *
 * Slack は X-Slack-Signature ヘッダで HMAC-SHA256 (signing_secret, `v0:${ts}:${rawBody}`)
 * を base64 で送ってくる。受信時に再計算 + timing-safe 比較で改竄検出。
 *
 * 設計: 暗号 primitive (hmac) は Node crypto に任せる、本 file は **buildSignatureBaseString
 * + parseSignatureHeader + isReplayAttack** の pure 部分だけ。実 hmac は別 wrapper
 * で呼ぶ想定 (server-only)。
 *
 * 詳細: FEEDBACK_QUEUE.md Slack ワンポチ entry / https://api.slack.com/authentication/verifying-requests-from-slack
 */

const SLACK_VERSION = 'v0'

export interface SlackSignatureInput {
  timestamp: string
  rawBody: string
}

/**
 * Slack signature の base string を作る。
 * 形式: `v0:${timestamp}:${rawBody}`
 * HMAC-SHA256 への入力として既定の組立て。
 */
export function buildSignatureBaseString(input: SlackSignatureInput): string {
  return `${SLACK_VERSION}:${input.timestamp}:${input.rawBody}`
}

/**
 * Slack signature ヘッダから version + hash を分解。
 * 形式: `v0=<hex hash>` を期待、不正なら null。
 */
export function parseSignatureHeader(header: string | null | undefined): {
  version: string
  hash: string
} | null {
  if (!header) return null
  const trimmed = header.trim()
  const match = trimmed.match(/^(v0)=([a-f0-9]{64})$/i)
  if (!match) return null
  return { version: match[1] ?? '', hash: (match[2] ?? '').toLowerCase() }
}

/**
 * X-Slack-Request-Timestamp と現在時刻の差から replay 攻撃判定。
 * Slack 公式推奨: 5 分超古いリクエストは reject。
 *
 * @param tsSeconds X-Slack-Request-Timestamp の値 (秒、Unix epoch)
 * @param nowMs    現在時刻 (ms、test では fixed)
 * @param windowSec 許容 window (default 300 = 5 分)
 */
export function isReplayAttack(tsSeconds: number, nowMs: number, windowSec: number = 300): boolean {
  if (!Number.isFinite(tsSeconds)) return true
  const diffMs = Math.abs(nowMs - tsSeconds * 1000)
  return diffMs > windowSec * 1000
}

/**
 * 計算済 hash vs ヘッダ送信値の timing-safe 比較 (constant-time)。
 * pure (Node crypto に依存しない) 実装: 長さチェック + 文字単位 XOR の合計。
 * **本 file の実装は SHA-256 出力長 (64 hex chars) 想定の簡易 timing-safe**。
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
