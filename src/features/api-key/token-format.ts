/**
 * iter (queue API/MCP substrate): API key 平文 token の生成 / parse / scope check pure 関数。
 *
 * 設計: API key 平文 = `${prefix}_${random32B base64url}`、prefix で workspace 帯を識別。
 * DB には SHA-256 hash + prefix だけ保存、平文は発行 1 回切り (= revoke 安全)。
 *
 * 本 file は **形式 / scope 判定** の pure helper のみ。実 hash 計算 (SHA-256) は別 file
 * (`token-hash.ts` Node crypto 依存) で実装する想定 — それを呼ぶ middleware は次 commit。
 *
 * 詳細: FEEDBACK_QUEUE.md REST API + MCP server 化 entry
 */

export type ApiScope = 'read' | 'write' | 'admin'

/** key prefix の固定: 「sk_」 (Stripe / OpenAI 風) で safer な慣習を踏襲 */
export const API_KEY_PREFIX = 'sk_'

/** 平文 token 全体の正規表現。base64url 32 bytes ≈ 43 chars + prefix */
const TOKEN_RE = /^sk_[A-Za-z0-9_-]{30,}$/

/** prefix 部分 (= UI で chip 表示する 「sk_xxxxxx」 の先頭 12 文字) */
export function extractKeyPrefix(plaintext: string): string {
  if (!TOKEN_RE.test(plaintext)) return ''
  return plaintext.slice(0, 12)
}

/** token 形式チェック (前段の validate 用、prefix + length) */
export function isValidApiTokenFormat(plaintext: string): boolean {
  return TOKEN_RE.test(plaintext)
}

/**
 * required scope を api_key の scopes 配列が含むか判定。
 * - 'admin' は 'write' も 'read' も implicit に含む (= admin は全権)
 * - 'write' は 'read' を含む (read-only より広い)
 *
 * 階層: read ⊆ write ⊆ admin
 */
const SCOPE_ORDER: Record<ApiScope, number> = {
  read: 1,
  write: 2,
  admin: 3,
}

export function hasRequiredScope(keyScopes: readonly string[], required: ApiScope): boolean {
  const requiredLevel = SCOPE_ORDER[required]
  let maxLevel = 0
  for (const s of keyScopes) {
    const level = SCOPE_ORDER[s as ApiScope]
    if (level && level > maxLevel) maxLevel = level
  }
  return maxLevel >= requiredLevel
}

/**
 * Authorization header `Bearer sk_xxx...` から token 部分抽出。
 * - 形式不正 → null
 * - prefix mismatch → null
 */
export function extractBearerToken(header: string | null | undefined): string | null {
  if (!header) return null
  const trimmed = header.trim()
  const match = trimmed.match(/^Bearer\s+(\S+)$/i)
  if (!match) return null
  const token = match[1] ?? ''
  if (!isValidApiTokenFormat(token)) return null
  return token
}

/**
 * UI 表示用 masked token: 末尾 4 文字以外を ★ で隠す。
 * 例: 'sk_abcdef...wxyz' → 'sk_******...wxyz'
 */
export function maskToken(plaintext: string): string {
  if (!isValidApiTokenFormat(plaintext)) return '****'
  const prefix = plaintext.slice(0, 3) // 'sk_'
  const tail = plaintext.slice(-4)
  return `${prefix}${'*'.repeat(6)}...${tail}`
}
