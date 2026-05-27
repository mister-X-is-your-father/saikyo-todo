/**
 * iter1414 (queue AP-6 substrate): API key の scope と AutomationPart の sideEffect を
 * 橋渡しする権限判定 pure helper。
 *
 * 設計目的 (FEEDBACK_QUEUE.md 自動処理パーツ catalog AP-6 / REST API+MCP entry):
 *   - mcp-bridge.ts は「scope key 絞込は AP-6 後続に委ねる」 と明示的に保留していた。
 *     本 helper がその欠けていた橋 = 「この api_key の scopes でこの part を実行してよいか」。
 *   - MCP / REST executor が part 実行前に `scopesAllowPart(key.scopes, part.sideEffect)`
 *     で gate、manifest 公開時は `filterManifestForScopes` で許可 part のみ expose。
 *
 * sideEffect → 必要 ApiScope のマッピング:
 *   - 'read'     → 'read'   (参照のみ)
 *   - 'write'    → 'write'  (DB mutation)
 *   - 'external' → 'write'  (外部副作用も write 相当。data 流出を伴うため将来 'admin' に
 *                            締める policy も可、現状は write で統一)
 *
 * api-key/token-format.ts の scope 階層 (read ⊆ write ⊆ admin) を再利用。
 * 副作用無し・依存は token-format (pure) + types のみ。
 */
import { type ApiScope, hasRequiredScope } from '@/features/api-key/token-format'

import type { PartSideEffect } from './types'

export function requiredScopeForSideEffect(sideEffect: PartSideEffect): ApiScope {
  switch (sideEffect) {
    case 'read':
      return 'read'
    case 'write':
    case 'external':
      return 'write'
  }
}

/** key の scopes でこの sideEffect の part を実行してよいか */
export function scopesAllowPart(keyScopes: readonly string[], sideEffect: PartSideEffect): boolean {
  return hasRequiredScope(keyScopes, requiredScopeForSideEffect(sideEffect))
}

/**
 * manifest / part 配列を「key の scopes で実行可能なもの」 に絞る。
 * `{ sideEffect }` を持つ任意の entry 型に適用可能 (PartManifestEntry / AnyPart 両対応)。
 */
export function filterManifestForScopes<T extends { sideEffect: PartSideEffect }>(
  entries: readonly T[],
  keyScopes: readonly string[],
): T[] {
  return entries.filter((e) => scopesAllowPart(keyScopes, e.sideEffect))
}
