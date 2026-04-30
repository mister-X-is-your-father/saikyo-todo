/**
 * iter535 (queue methodology GT-3 substrate): GTD Inbox Process flow の pure
 * 分類 helper。
 *
 * 設計目的 (docs/methodology-modes-plan.md GT-3 + GTD methodology):
 *   - GTD の中核 「Inbox → Process」 で 1 item を 5 step flow で分類:
 *     1. **2-min rule**: 2 分以内ならすぐやる (= immediate)
 *     2. **action 必要か**: NO → reference / someday / trash
 *     3. **next action 1 つで終わるか**: YES → next-action / NO → project (要分解)
 *     4. **delegate 可能か**: YES → waiting-for
 *     5. **defer**: 上記いずれでもなければ scheduled / next-action
 *   - 入力 = 1 item (estimate / dueDate / dependencies / dod 等)
 *   - 出力 = `bucket: 'immediate' | 'next-action' | 'project' | 'waiting-for' |
 *            'reference' | 'someday' | 'scheduled' | 'trash'` + reason
 *
 * AI 不使用、副作用無し、依存無し。pure helper + Vitest 単体 test で網羅。
 */

export type GtdBucket =
  | 'immediate'
  | 'next-action'
  | 'project'
  | 'waiting-for'
  | 'reference'
  | 'someday'
  | 'scheduled'
  | 'trash'

export interface InboxItemFields {
  id: string
  title: string
  /** 1 行 dod。空 / null = 未入力 */
  dod?: string | null | undefined
  /** 見積分。null/undefined = 未推定 */
  estimateMin?: number | null | undefined
  /** 担当 user id。空配列なら未割当 */
  assigneeIds?: readonly string[] | null | undefined
  /** 関連 stakeholders user id (= waiting-for 候補)。GTD 「他の人 待ち」 */
  stakeholderIds?: readonly string[] | null | undefined
  /** 子 task の有無 (= project 判定): 1 つでも subtask あれば project 候補 */
  hasSubtasks?: boolean | null | undefined
  /** ISO YYYY-MM-DD or null。dueDate あれば scheduled bucket */
  dueDate?: string | null | undefined
  /** GTD context (例 '@home', '@office'、後発の tag_kind 列で実装される)。空文字列なら未指定 */
  contextTag?: string | null | undefined
  /** 「これは reference (= action 不要)」 を明示するなら true */
  isReference?: boolean | null | undefined
  /** 「someday/maybe」 を明示するなら true */
  isSomeday?: boolean | null | undefined
  /** 内容が空 / 不明 (trash 判定用) */
  isEmptyOrUnclear?: boolean | null | undefined
}

export interface InboxClassification {
  bucket: GtdBucket
  /** 1 行 reason、なぜこの bucket かの根拠 (UI 表示用) */
  reason: string
  /** 「次の action」 の suggestion (next-action / project / immediate のみ、それ以外は null) */
  suggestedAction: string | null
}

const TWO_MINUTES = 2

/**
 * 1 item を GTD 5-step flow に従って 8 bucket のいずれかに分類する。
 *
 * 判定優先順:
 *   1. trash (isEmptyOrUnclear)
 *   2. reference (isReference)
 *   3. someday (isSomeday)
 *   4. immediate (estimate≤2min + active)
 *   5. waiting-for (assignee が自分でない、= stakeholder 待ち候補)
 *   6. project (hasSubtasks=true、要分解)
 *   7. scheduled (dueDate あり、未来)
 *   8. next-action (上記いずれにも該当しない、= 即やる候補)
 */
export function classifyInboxItem(item: InboxItemFields): InboxClassification {
  // 1. trash
  if (item.isEmptyOrUnclear) {
    return {
      bucket: 'trash',
      reason: '内容が不明 / 空 — 削除候補',
      suggestedAction: null,
    }
  }

  // 2. reference (action 不要)
  if (item.isReference) {
    return {
      bucket: 'reference',
      reason: '参考資料 — action 不要',
      suggestedAction: null,
    }
  }

  // 3. someday/maybe
  if (item.isSomeday) {
    return {
      bucket: 'someday',
      reason: '「いつか / もしかしたら」 — 後で再 review',
      suggestedAction: null,
    }
  }

  // 4. 2-min rule
  const est = typeof item.estimateMin === 'number' ? item.estimateMin : null
  if (est !== null && est > 0 && est <= TWO_MINUTES) {
    return {
      bucket: 'immediate',
      reason: `見積 ${est} 分 — 2 分 rule で即実行`,
      suggestedAction: '今すぐやる',
    }
  }

  // 5. waiting-for (delegate 済 = 担当 0 + stakeholder あり)
  const assignees = item.assigneeIds ?? []
  const stakeholders = item.stakeholderIds ?? []
  if (assignees.length === 0 && stakeholders.length > 0) {
    return {
      bucket: 'waiting-for',
      reason: `${stakeholders.length} 件の関係者 待ち`,
      suggestedAction: '次の動きを待つ',
    }
  }

  // 6. project (subtasks 必要)
  if (item.hasSubtasks) {
    return {
      bucket: 'project',
      reason: '複数 step の outcome — 分解 (subtask) 必要',
      suggestedAction: '次の物理 action を 1 つ決める',
    }
  }

  // 7. scheduled (dueDate あり、未来)
  if (item.dueDate) {
    return {
      bucket: 'scheduled',
      reason: `期限 ${item.dueDate} — 予定済`,
      suggestedAction: '期日近接時に実行',
    }
  }

  // 8. next-action (default)
  const ctxLabel = item.contextTag ? ` (${item.contextTag})` : ''
  return {
    bucket: 'next-action',
    reason: `次の action${ctxLabel} — Engage list へ`,
    suggestedAction: item.dod ?? item.title,
  }
}

/**
 * Inbox 全 items を 8 bucket に分類して count + items をまとめる。
 * UI で「Inbox に N 件、うち next-action: 5 / project: 3 / ...」 表示用。
 */
export interface InboxBucketSummary<T extends InboxItemFields> {
  buckets: Record<GtdBucket, T[]>
  counts: Record<GtdBucket, number>
  /** 2-min rule で即やる候補の上位 5 (estimate 短い順) */
  twoMinRuleSuggestions: T[]
}

export function summarizeInbox<T extends InboxItemFields>(
  items: readonly T[],
): InboxBucketSummary<T> {
  const buckets: Record<GtdBucket, T[]> = {
    immediate: [],
    'next-action': [],
    project: [],
    'waiting-for': [],
    reference: [],
    someday: [],
    scheduled: [],
    trash: [],
  }
  for (const it of items) {
    const c = classifyInboxItem(it)
    buckets[c.bucket].push(it)
  }
  const counts = (Object.keys(buckets) as GtdBucket[]).reduce(
    (acc, k) => {
      acc[k] = buckets[k].length
      return acc
    },
    {} as Record<GtdBucket, number>,
  )

  // 2-min rule 候補 top 5 (estimate 短い順、tie は title 昇順)
  const twoMinRuleSuggestions = [...buckets.immediate]
    .sort((a, b) => {
      const ea = typeof a.estimateMin === 'number' ? a.estimateMin : Number.MAX_SAFE_INTEGER
      const eb = typeof b.estimateMin === 'number' ? b.estimateMin : Number.MAX_SAFE_INTEGER
      if (ea !== eb) return ea - eb
      return a.title.localeCompare(b.title)
    })
    .slice(0, 5)

  return { buckets, counts, twoMinRuleSuggestions }
}
