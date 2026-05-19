/**
 * iter (queue 関連情報 substrate): item ごとに「関連情報」 (doc / url / item / comment) を
 * score 付けして並び順を決める pure 関数。
 *
 * ユーザ要望: 「関連情報や必要情報に簡単にアクセスできる機能」
 *
 * 設計判断 (FEEDBACK_QUEUE.md 関連情報 entry):
 *   - DB schema: `item_related_resources (item_id, kind 'doc'|'url'|'item'|'comment', resource_id,
 *     label, pinned bool, score float)` 中間テーブル
 *   - **pinned=true** は常に上位 (手動 pin で確定表示)
 *   - 残りは score 降順 (= auto-suggest 順)
 *   - 既存 doc_chunks (HNSW embedding) の semantic 検索 score を直接消費する想定
 *
 * 本 helper は **score 計算** 経路ではなく、**rows → 表示順 + group** の整列 layer。
 * 既存 Researcher / doc embedding 経路が score を返してくれる前提。
 */

export type ResourceKind = 'doc' | 'url' | 'item' | 'comment'

export interface RelatedResourceRow {
  kind: ResourceKind
  resourceId: string
  label: string
  pinned: boolean
  /** 0..1 範囲の relevance score (auto-suggest 時のみ意味あり、pinned=true は score 無視) */
  score: number
}

export interface RelatedResourcesView {
  pinned: RelatedResourceRow[]
  suggested: RelatedResourceRow[]
  total: number
  /** kind 別の件数 (UI tab badge 用) */
  byKind: Record<ResourceKind, number>
}

/**
 * pinned + suggested の 2 段で整列。pinned は手動順、suggested は score 降順。
 * score が thresh 未満の suggested は除外 (= noise filter)。
 */
export function organizeRelatedResources(
  rows: readonly RelatedResourceRow[],
  options?: { suggestedScoreThreshold?: number; suggestedLimit?: number },
): RelatedResourcesView {
  const threshold = options?.suggestedScoreThreshold ?? 0.4
  const limit = options?.suggestedLimit ?? 10

  const pinned = rows.filter((r) => r.pinned)
  const suggested = rows
    .filter((r) => !r.pinned && r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  const byKind: Record<ResourceKind, number> = {
    doc: 0,
    url: 0,
    item: 0,
    comment: 0,
  }
  for (const r of [...pinned, ...suggested]) byKind[r.kind] += 1

  return {
    pinned,
    suggested,
    total: pinned.length + suggested.length,
    byKind,
  }
}

/**
 * (kind, resourceId) で重複 row を dedup (pinned 優先で 1 件残す)。
 * 同 doc が手動 pin + auto-suggest の両方に出てきた時 1 件にまとめる。
 */
export function dedupeRelatedResources(rows: readonly RelatedResourceRow[]): RelatedResourceRow[] {
  const map = new Map<string, RelatedResourceRow>()
  for (const r of rows) {
    const key = `${r.kind}:${r.resourceId}`
    const existing = map.get(key)
    if (!existing || (r.pinned && !existing.pinned)) {
      map.set(key, r)
    }
  }
  return [...map.values()]
}
