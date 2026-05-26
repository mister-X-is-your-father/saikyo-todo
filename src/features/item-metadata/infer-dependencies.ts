/**
 * iter (queue task metadata 拡張 substrate): I/O artifact label マッチで依存関係を推論する pure 関数。
 *
 * ユーザ要望:
 *   - 「タスクに input と output 設定 → それで依存関係もわかる」
 *
 * 設計判断:
 *   - **lower-case 完全一致 + trim** で match (簡潔、surprise 少ない)
 *   - 自己依存 (= 同 item の input と output が同 label) は除外
 *   - 「output→input」 で `from = output 提供 item`、`to = input 必要 item` の有向 edge
 *   - 結果は `item_dependencies` の `{from, to, type='blocks'}` shape と互換、ただし service 層で
 *     **suggest only (auto insert しない)**、user 承認後に挿入する想定
 *
 * 詳細: FEEDBACK_QUEUE.md タスク metadata 拡張 entry + ~/.claude/plans/saikyo-todo に I/O 設計
 */

export interface IoArtifactLike {
  itemId: string
  kind: 'input' | 'output'
  label: string
}

export interface InferredDependency {
  /** output を提供する側 (= 先にやる) */
  fromItemId: string
  /** input を要する側 (= 後にやる) */
  toItemId: string
  /** マッチした artifact label (lower-case 正規化済) */
  label: string
}

function normalizeLabel(s: string): string {
  return s.trim().toLowerCase()
}

/**
 * I/O artifact 配列から「output が input にマッチする pair」 を列挙。
 *
 * - 1 つの output が 複数 item の input にマッチ → N 件 edge を出す
 * - 同じ pair (fromItemId, toItemId, label) が重複しないよう dedup
 * - 自己依存 (fromItemId === toItemId) は除外
 * - 空 label / whitespace-only label は無視 (matching 対象外)
 */
export function inferDependenciesFromIo(
  artifacts: readonly IoArtifactLike[],
): InferredDependency[] {
  // label 正規化キー → output 提供 itemId 一覧
  const outputsByLabel = new Map<string, Set<string>>()
  // label 正規化キー → input 要求 itemId 一覧
  const inputsByLabel = new Map<string, Set<string>>()

  for (const a of artifacts) {
    const key = normalizeLabel(a.label)
    if (!key) continue
    const map = a.kind === 'output' ? outputsByLabel : inputsByLabel
    if (!map.has(key)) map.set(key, new Set())
    map.get(key)!.add(a.itemId)
  }

  const seen = new Set<string>() // "from|to|label" dedup key
  const result: InferredDependency[] = []

  for (const [label, outputs] of outputsByLabel) {
    const inputs = inputsByLabel.get(label)
    if (!inputs) continue
    for (const fromItemId of outputs) {
      for (const toItemId of inputs) {
        if (fromItemId === toItemId) continue // 自己依存除外
        const dedupKey = `${fromItemId}|${toItemId}|${label}`
        if (seen.has(dedupKey)) continue
        seen.add(dedupKey)
        result.push({ fromItemId, toItemId, label })
      }
    }
  }

  return result
}

/**
 * 推論結果から「特定 item に必要な input がまだ満たされてない (= output 提供元の item が done でない)」
 * のリストを返す。「漏れ防止」 「依存先 done で本 item 動く」 通知の data 源。
 */
export interface ItemDoneStatus {
  itemId: string
  done: boolean
}

export interface BlockedInputReport {
  itemId: string
  blockingItems: { fromItemId: string; label: string }[]
}

export function findUnsatisfiedInputs(
  artifacts: readonly IoArtifactLike[],
  itemDoneStatuses: readonly ItemDoneStatus[],
): BlockedInputReport[] {
  const deps = inferDependenciesFromIo(artifacts)
  const doneMap = new Map(itemDoneStatuses.map((s) => [s.itemId, s.done]))
  const byTo = new Map<string, { fromItemId: string; label: string }[]>()
  for (const d of deps) {
    if (doneMap.get(d.fromItemId)) continue // from が done なら block 解消
    if (!byTo.has(d.toItemId)) byTo.set(d.toItemId, [])
    byTo.get(d.toItemId)!.push({ fromItemId: d.fromItemId, label: d.label })
  }
  return [...byTo.entries()].map(([itemId, blockingItems]) => ({ itemId, blockingItems }))
}

/**
 * iter1371 (queue: タスク metadata 拡張 — I/O 依存推論): どの output にも一致しない input
 * (= 入手経路が存在しない前提) を返す pure helper。
 *
 * `findUnsatisfiedInputs` は「output 提供元 item がまだ done でない」 (= 待てば解消) を見るが、
 * 本 helper は「そもそも その input を output する item が 1 つも無い」 を検出する。
 * これは段取りの穴 (= 必要なものを誰も作らない) を能動的に警告する signal:
 * 「この task は X を入力に要するが、X を成果物にする task が存在しない」。
 *
 * 仕様:
 *  - output label (正規化: trim + lower-case) 集合を作り、その集合に無い input を抽出
 *  - 空 / whitespace-only label は無視
 *  - 同一 (itemId, 正規化 label) の重複 input は 1 件に集約
 *  - 出力 label は 元の表記 (正規化前) を保持 (UI 表示用)、元の出現順を維持
 */
export interface DanglingInput {
  itemId: string
  label: string
}

export function findDanglingInputs(artifacts: readonly IoArtifactLike[]): DanglingInput[] {
  const outputLabels = new Set<string>()
  for (const a of artifacts) {
    if (a.kind !== 'output') continue
    const key = normalizeLabel(a.label)
    if (key) outputLabels.add(key)
  }

  const seen = new Set<string>()
  const result: DanglingInput[] = []
  for (const a of artifacts) {
    if (a.kind !== 'input') continue
    const key = normalizeLabel(a.label)
    if (!key || outputLabels.has(key)) continue
    const dedupKey = `${a.itemId}|${key}`
    if (seen.has(dedupKey)) continue
    seen.add(dedupKey)
    result.push({ itemId: a.itemId, label: a.label })
  }
  return result
}
