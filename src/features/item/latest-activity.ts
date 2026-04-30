/**
 * iter463 P0 (queue: 案件サマリ panel scope A): parent Item ツリー (parent +
 * 全子孫) の **最終更新タイムスタンプ** を返す pure helper。
 *
 * 「この案件、今どんな感じ？」(2026-04-29 ユーザ要望) の summary panel が
 * 「最終 update: 5 分前」等を 1 関数で出すための substrate。AI 朝 brief /
 * dashboard widget / Kanban カード disclosure からも同じ logic で再利用可。
 *
 * 既存 substrate との対称性:
 *  - `descendants-progress.ts` (iter417) — 進捗 % / status bucket count
 *  - `dependency-readiness.ts` — 依存解決 sumamry
 *  - 本 helper — **時間軸**の最終更新 (= 「動いているか / 停滞しているか」の signal)
 *
 * 既存資産:
 *  - `fullPathOf` / `isPathDescendantOf` (lib/db/ltree-path)
 *  - `formatRelativeTime` (notification/format) で「5 分前」 ja-JP 文字列化
 *
 * 仕様:
 *  - parent (= self) と descendants を 1 つの Date 集合と見なし、最大値を返す
 *  - `deletedAt != null` の Item は除外 (live 子孫のみ)
 *  - `updatedAt` が null / undefined / 不正値 (NaN) の Item は除外
 *  - 該当なし → null
 */
import { isPathDescendantOf } from '@/lib/db/ltree-path'

export interface ActivityCandidate {
  id: string
  parentPath: string
  updatedAt: Date | string | null | undefined
  deletedAt?: Date | string | null
}

/**
 * parent + 子孫の updatedAt のうち最大を返す。該当なし null。
 *
 * - parentFullPath: parent のフル path (= parent.parentPath + uuidLabel(parent.id) を
 *   呼び側で `fullPathOf` で算出して渡す)
 * - candidates: workspace 全 Item or sub set。parent 自身は parentPath で除外
 *   不可能なので id 一致で除外する。
 */
export function findLatestUpdatedAt(
  parent: { id: string; updatedAt: Date | string | null | undefined },
  parentFullPath: string,
  candidates: ActivityCandidate[],
): Date | null {
  let max: Date | null = parseDate(parent.updatedAt)
  for (const c of candidates) {
    if (c.id === parent.id) continue
    if (c.deletedAt) continue
    if (!isPathDescendantOf(c.parentPath, parentFullPath)) continue
    const d = parseDate(c.updatedAt)
    if (!d) continue
    if (!max || d.getTime() > max.getTime()) max = d
  }
  return max
}

function parseDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isFinite(d.getTime()) ? d : null
}

/**
 * `findLatestUpdatedAt` の結果を ja-JP 1 行 summary に整形。
 * `formatRelativeTime` (notification/format) を thin wrap、null sentinel を
 * '最終更新なし' に統一。caller は now を渡せる (テスト deterministic 化)。
 */
export function formatLatestActivityJa(
  latest: Date | null,
  now: Date,
  formatRelative: (d: Date, now: Date) => string,
): string {
  if (!latest) return '最終更新なし'
  return `最終更新: ${formatRelative(latest, now)}`
}
