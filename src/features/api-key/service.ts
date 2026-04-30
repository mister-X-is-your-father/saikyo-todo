/**
 * queue: REST API + MCP server 化 substrate — api_keys の生成 / verify / revoke / list。
 *
 * key 生成:
 *   - 32 bytes random → base64url (43 chars 程度)
 *   - 平文 key は **生成時の 1 度きり** ユーザに表示 (戻り値に含む)
 *   - 保存は SHA-256(plaintext) hex 64 chars のみ
 *   - prefix は plaintext の先頭 8 chars + '...'  (UI 識別用)
 *
 * 認証:
 *   - Bearer header の plaintext を SHA-256 → keyHash で lookup
 *   - revoked_at is null & (expires_at is null or expires_at > now())
 *   - last_used_at touch (best-effort)
 *
 * UI / Server Action / Route Handler 統合は後続 commit (REST API entry の Phase 1 続き)。
 */
import 'server-only'

import { createHash, randomBytes } from 'node:crypto'

import { recordAudit } from '@/lib/audit'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { adminDb, withUserDb } from '@/lib/db/scoped-client'
import { AuthError, NotFoundError, PermissionError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { apiKeyRepository } from './repository'
import {
  type ApiKey,
  type ApiKeyVerifyResult,
  CreateApiKeyInputSchema,
  ListApiKeysInputSchema,
  RevokeApiKeyInputSchema,
} from './schema'

const KEY_BYTES = 32
const PLAINTEXT_PREFIX = 'sk_st_' // saikyo-todo prefix

function generatePlaintextKey(): { plaintext: string; hash: string; prefix: string } {
  const raw = randomBytes(KEY_BYTES).toString('base64url')
  const plaintext = `${PLAINTEXT_PREFIX}${raw}`
  const hash = createHash('sha256').update(plaintext).digest('hex')
  const prefix = `${plaintext.slice(0, PLAINTEXT_PREFIX.length + 8)}...`
  return { plaintext, hash, prefix }
}

export const apiKeyService = {
  /** owner / admin が新規 key を発行する。戻り値の plaintext は **1 度きり** ユーザに表示。 */
  async create(input: unknown): Promise<Result<{ apiKey: ApiKey; plaintext: string }>> {
    const parsed = CreateApiKeyInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data = parsed.data

    const user = await requireUser()
    await requireWorkspaceMember(data.workspaceId, 'admin')

    const { plaintext, hash, prefix } = generatePlaintextKey()

    return await withUserDb(user.id, async (tx) => {
      const row = await apiKeyRepository.insert(tx, {
        workspaceId: data.workspaceId,
        label: data.label,
        keyHash: hash,
        keyPrefix: prefix,
        scopes: data.scopes,
        createdByUserId: user.id,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      })
      await recordAudit(tx, {
        workspaceId: data.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'api_key',
        targetId: row.id,
        action: 'create',
        // plaintext は audit に残さない (hash と prefix のみ)
        after: { id: row.id, label: row.label, scopes: row.scopes, keyPrefix: row.keyPrefix },
      })
      return ok({ apiKey: row, plaintext })
    })
  },

  async list(input: unknown): Promise<Result<ApiKey[]>> {
    const parsed = ListApiKeysInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data = parsed.data

    const user = await requireUser()
    await requireWorkspaceMember(data.workspaceId, 'admin')

    return await withUserDb(user.id, async (tx) => {
      const rows = await apiKeyRepository.list(tx, data)
      return ok(rows)
    })
  },

  async revoke(input: unknown): Promise<Result<ApiKey>> {
    const parsed = RevokeApiKeyInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data = parsed.data

    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await apiKeyRepository.findById(tx, data.id)
      if (!before) return err(new NotFoundError('api_key が見つかりません'))
      await requireWorkspaceMember(before.workspaceId, 'admin')

      const revoked = await apiKeyRepository.revoke(tx, data.id)
      if (!revoked) return err(new NotFoundError('既に revoke 済みか存在しません'))

      await recordAudit(tx, {
        workspaceId: before.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'api_key',
        targetId: revoked.id,
        action: 'revoke',
        before: { revokedAt: before.revokedAt },
        after: { revokedAt: revoked.revokedAt },
      })
      return ok(revoked)
    })
  },

  /**
   * Bearer header の plaintext を verify する。auth context 不要 (= REST API / MCP の
   * 入口で呼ぶ)。
   *
   * 重要: ここは RLS bypass の adminDb を使う (まだ user context が無い段階で auth 確立)。
   * eslint allowlist: src/features/api-key/service.ts (本 file)
   */
  async verifyPlaintext(plaintext: string): Promise<Result<ApiKeyVerifyResult>> {
    if (!plaintext || plaintext.length < 16) return err(new AuthError('invalid api key format'))
    const hash = createHash('sha256').update(plaintext).digest('hex')

    const found = await adminDb.transaction((tx) => apiKeyRepository.findByHash(tx, hash))
    if (!found) return err(new AuthError('api key not found'))
    if (found.revokedAt) return err(new PermissionError('api key revoked'))
    if (found.expiresAt && found.expiresAt.getTime() < Date.now()) {
      return err(new PermissionError('api key expired'))
    }

    // best-effort touch (失敗しても auth は通す)
    try {
      await adminDb.transaction((tx) => apiKeyRepository.touch(tx, found.id))
    } catch {
      // ignore — auth path を遅延させない
    }

    return ok({
      apiKeyId: found.id,
      workspaceId: found.workspaceId,
      scopes: found.scopes as ApiKeyVerifyResult['scopes'],
      createdByUserId: found.createdByUserId,
    })
  },
}
