/**
 * iter417 ai-automation: Item の子孫タスク (parentPath ltree で繋がる subtree) の
 * 進捗 stat を返す pure helper。
 *
 * FEEDBACK_QUEUE「『この案件、今どんな感じ？』『どう着地させるつもり？』を 1 画面で
 * 一目化」の **scope A 最小** で必要となる substrate (= ItemEditDialog 新 tab
 * 「サマリ」/ Kanban カード disclosure / dashboard widget が「子孫の進捗 %」を
 * 1 関数で取り出せる)。
 *
 * 対象範囲:
 *   - parentItem の **直下〜全子孫** (深さ無制限、ltree fullPath で prefix match)
 *   - parentItem 自身は含めない (= 自分の status は別軸)
 *   - `deletedAt != null` の Item は除外
 *
 * 既存資産:
 *   - `fullPathOf({id, parentPath})` (lib/db/ltree-path) で parent のフル path を計算
 *   - `normalizeStatus` (status-visual.ts) で status を 6 値 ('todo' /
 *     'in_progress' / 'done' / 'cancelled' / 'blocked' / 'unknown') に正規化
 *
 * 仕様 (status bucket):
 *   - todo / in_progress / blocked / cancelled / done / unknown を bucket 集計
 *   - 「全件 (total)」 = cancelled も含めた deletedAt なし子孫の数
 *   - 「pctDone」は (done / (total - cancelled)) * 100 (cancelled は分母から除外、
 *     0 除算は 0 として返す)。`Math.round` で整数化。
 *   - 全 done (= isComplete) は pctDone === 100 && total > 0
 */
import { fullPathOf } from '@/lib/db/ltree-path'

import { normalizeStatus } from './status-visual'

export interface DescendantsProgress {
  /** deletedAt なし子孫の総件数 (cancelled も含む) */
  total: number
  /** done */
  done: number
  /** in_progress */
  inProgress: number
  /** blocked */
  blocked: number
  /** todo */
  todo: number
  /** cancelled */
  cancelled: number
  /** 上記以外 (未知 status / null) */
  unknown: number
  /** done / (total - cancelled) を 0..100 整数で。total - cancelled === 0 → 0 */
  pctDone: number
  /** pctDone === 100 && total > 0 */
  isComplete: boolean
}

interface DescendantFields {
  parentPath: string
  status: string | null | undefined
  deletedAt?: Date | null
}

const EMPTY_RESULT: DescendantsProgress = {
  total: 0,
  done: 0,
  inProgress: 0,
  blocked: 0,
  todo: 0,
  cancelled: 0,
  unknown: 0,
  pctDone: 0,
  isComplete: false,
}

/**
 * `parent` の子孫 (parentPath ltree prefix match) を集計。
 *
 * 子孫判定:
 *   - parent のフル path = `fullPathOf(parent)` を prefix とする全 Item
 *   - 直下の子: parentPath === parentFull
 *   - 孫以降: parentPath が `${parentFull}.` で始まる
 *   - 自分自身は含めない (parentPath は parent のフル path にならないため自然除外)
 *
 * 子孫ゼロ → `EMPTY_RESULT` 構造 (全 0、pctDone=0、isComplete=false)。
 */
export function summarizeDescendantsProgress(
  parent: { id: string; parentPath: string },
  allItems: readonly DescendantFields[],
): DescendantsProgress {
  const parentFull = fullPathOf(parent)
  const directPrefix = `${parentFull}.`

  const counts = {
    todo: 0,
    in_progress: 0,
    done: 0,
    cancelled: 0,
    blocked: 0,
    unknown: 0,
  }
  let total = 0
  for (const it of allItems) {
    if (it.deletedAt != null) continue
    const isDirect = it.parentPath === parentFull
    const isDeeper = it.parentPath.startsWith(directPrefix)
    if (!isDirect && !isDeeper) continue
    total += 1
    counts[normalizeStatus(it.status)] += 1
  }

  if (total === 0) return EMPTY_RESULT

  const denom = total - counts.cancelled
  const pctDone = denom === 0 ? 0 : Math.round((counts.done / denom) * 100)
  return {
    total,
    done: counts.done,
    inProgress: counts.in_progress,
    blocked: counts.blocked,
    todo: counts.todo,
    cancelled: counts.cancelled,
    unknown: counts.unknown,
    pctDone,
    isComplete: pctDone === 100 && total > 0,
  }
}

/**
 * AI brief / dashboard widget / ItemEditDialog 「サマリ」 tab 用 1 行 summary。
 *
 *   - 子孫ゼロ → `'子タスクなし'`
 *   - 全 cancelled (denom=0) → `'子 N 件 (全キャンセル)'`
 *   - その他 → `'進捗 60%: 完了 6 / 進行中 2 / blocked 1 / 残 N 件 (全 K 件)'`
 *     (count > 0 の status のみ append、todo / cancelled は省略可)
 *
 * 仕様:
 *  - pctDone を必ず先頭に表示 (0..100 整数)
 *  - status 別件数は `count > 0` の bucket のみ append (順序: done / 進行中 /
 *    blocked / todo / cancelled / unknown)
 *  - 末尾に '(全 K 件)' で総件数を補完 (cancelled 含む)
 */
export function formatDescendantsProgressJa(p: DescendantsProgress): string {
  if (p.total === 0) return '子タスクなし'
  const denom = p.total - p.cancelled
  if (denom === 0) return `子 ${p.total} 件 (全キャンセル)`

  const parts: string[] = []
  if (p.done > 0) parts.push(`完了 ${p.done}`)
  if (p.inProgress > 0) parts.push(`進行中 ${p.inProgress}`)
  if (p.blocked > 0) parts.push(`blocked ${p.blocked}`)
  if (p.todo > 0) parts.push(`todo ${p.todo}`)
  if (p.cancelled > 0) parts.push(`キャンセル ${p.cancelled}`)
  if (p.unknown > 0) parts.push(`不明 ${p.unknown}`)
  const body = parts.length > 0 ? `: ${parts.join(' / ')}` : ''
  return `進捗 ${p.pctDone}%${body} (全 ${p.total} 件)`
}
