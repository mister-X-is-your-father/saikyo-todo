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

import type { ChipTone } from '@/lib/ui/chip-tone'

import type { AgentBriefSignal } from '@/features/agent/brief-signal'

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
 * iter539 ai-automation polish: GtdBucket → Japanese label の pure helper。
 * chip aria-label / Slack 通知 / AI prompt 用。SeverityChip tone bind とは別軸 (= bucket
 * は分類軸、Severity は深刻度軸)。
 */
const BUCKET_LABEL_JA: Record<GtdBucket, string> = {
  immediate: '即実行',
  'next-action': '次の action',
  project: 'プロジェクト',
  'waiting-for': '関係者待ち',
  reference: '参考資料',
  someday: 'いつか / もしかしたら',
  scheduled: '予定済',
  trash: '削除候補',
}

export function gtdBucketLabelJa(bucket: GtdBucket): string {
  return BUCKET_LABEL_JA[bucket]
}

/**
 * iter544 ai-automation polish: GtdBucket → SeverityChip tone bridge。
 * 「即実行」 / 「次の action」 が attention 軸最上位、「参考」 / 「いつか」 / 「予定済」
 * は neutral、「削除候補」 は muted。bucket は分類軸だが、Inbox process UI で「今すぐ
 * 何を見るべきか」 を chip 配色で示すには必須。
 *
 * 'immediate'    → 'warn'   (= 即実行を促す警報、2 分 rule で速攻片付ける)
 * 'next-action'  → 'info'   (= 進行中、優先順位ありの実行待ち)
 * 'project'      → 'info'   (= 分解必要、複数 step だが進行中)
 * 'waiting-for'  → 'warn'   (= 関係者待ち、リマインドが要るかも)
 * 'reference'    → 'muted'  (= 参考、attention 不要)
 * 'someday'      → 'muted'  (= いつか、attention 不要)
 * 'scheduled'    → 'info'   (= 予定済、期日まで放置 ok)
 * 'trash'        → 'muted'  (= 削除候補、attention 不要)
 */
const BUCKET_SEVERITY: Record<GtdBucket, 'ok' | 'info' | 'warn' | 'danger' | 'muted'> = {
  immediate: 'warn',
  'next-action': 'info',
  project: 'info',
  'waiting-for': 'warn',
  reference: 'muted',
  someday: 'muted',
  scheduled: 'info',
  trash: 'muted',
}

export function gtdBucketSeverity(bucket: GtdBucket): 'ok' | 'info' | 'warn' | 'danger' | 'muted' {
  return BUCKET_SEVERITY[bucket]
}

/**
 * iter1036 basics: GtdBucket → 共通 `ChipTone` (6 値 vocab) bridge。
 *
 * iter544 `gtdBucketSeverity` (= Severity 5 値 SeverityChip bind 用) と対称な「ChipTone 6 値
 * vocab」 版。dashboard chip-tone / AgentBriefSignal / Slack 通知 tone は ChipTone (=
 * 'danger'/'urgent'/'warn'/'info'/'idle'/'success') を要求するため、Severity の 'muted' を
 * 'idle' に lossy 変換する bridge が必要。
 *
 * 配色 token:
 *   'immediate'    → 'urgent' (= 即実行を 'warn' より強い tier に framing、2 分 rule 強調)
 *   'next-action'  → 'info'   (= 進行中、優先順位ありの実行待ち)
 *   'project'      → 'info'   (= 分解必要、複数 step だが進行中)
 *   'waiting-for'  → 'warn'   (= 関係者待ち、リマインドが要るかも)
 *   'reference'    → 'idle'   (= 参考、attention 不要 = muted 相当)
 *   'someday'      → 'idle'   (= いつか、attention 不要)
 *   'scheduled'    → 'info'   (= 予定済、期日まで放置 ok)
 *   'trash'        → 'idle'   (= 削除候補、attention 不要)
 *
 * 'immediate' を 'urgent' に強化 (= gtdBucketSeverity では 'warn' 同 tier の waiting-for と
 * 区別不能だった、ChipTone の 'urgent' は 'warn' より上の tier で 2 分 rule の即実行性を強調)。
 *
 * iter1030 `consultationStatusChipTone` / iter1035 `weeklyReviewDueChipTone` と並ぶ「domain
 * status → ChipTone」 pattern の GTD bucket 軸版。caller (= GTD mode inbox dashboard chip /
 * Slack daily digest / AgentBriefSignal) は本 bridge で chip tone 1 関数化。
 */
const BUCKET_CHIP_TONE: Record<GtdBucket, ChipTone> = {
  immediate: 'urgent',
  'next-action': 'info',
  project: 'info',
  'waiting-for': 'warn',
  reference: 'idle',
  someday: 'idle',
  scheduled: 'info',
  trash: 'idle',
}

export function gtdBucketChipTone(bucket: GtdBucket): ChipTone {
  return BUCKET_CHIP_TONE[bucket]
}

/**
 * iter1038 basics: GtdBucket → `AgentBriefSignal` (text + tone) compose helper。
 *
 * iter794-797 + iter1025/1031/1035 `*ToBriefSignal` pattern (= 10 + 1 axes 弾) の GTD bucket
 * 軸版で AI 朝 brief / Slack daily digest / dashboard chip area に 1 chip 渡せる。text は
 * `gtdBucketLabelJa` (= bucket Japanese label、'即実行' / '次の action' / 'project' / ...)、
 * tone は iter1036 `gtdBucketChipTone` を再利用 (= chip 配色と signal tone が完全一致)。
 *
 * caller pattern:
 *   const bucket = classifyInboxItem(item).bucket
 *   const signal = gtdBucketToBriefSignal(bucket)
 *   // → composeAnalyticsSignals 風に concat、または単独 chip render
 *
 * 用途:
 *   - GTD inbox dashboard 「item N の bucket 提案」 chip (= bucket 1 個分の signal)
 *   - Slack daily digest 「最重要 inbox item: bucket=`即実行`」 行
 *   - 別軸 (summary) は formatInboxBucketsJa が担当 (= 全 bucket count 1 行)
 */
export function gtdBucketToBriefSignal(bucket: GtdBucket): AgentBriefSignal {
  return {
    text: gtdBucketLabelJa(bucket),
    tone: gtdBucketChipTone(bucket),
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

/**
 * AI prompt / chip aria-label / Slack 通知用 1 行 inbox summary:
 *   'Inbox 12 件: 次の action 5 / プロジェクト 3 / 関係者待ち 2 / 即実行 2'
 *   'Inbox 0 件 (空)'
 *
 * count=0 bucket は省略。bucket 表示順は count 降順 (= 多い bucket が先)、tie は
 * BUCKET_LABEL_JA 定義順 stable。
 */
/**
 * iter1054 refactor: `Record<GtdBucket, number>` の合計件数を計算する pure helper。
 *
 * 既存 `formatInboxBucketsJa` / `classifyInboxHealthHint` の 2 callsite で `(Object.keys(counts)
 * as GtdBucket[]).reduce((s, k) => s + counts[k], 0)` の同 reduce が inline 重複していたので
 * 1 source of truth に集約。caller は `totalBucketCounts(summary.counts)` で 1 行参照。
 *
 * 0 件 sentinel (= empty inbox) の判定 / health classify thresholds (100, 30) と同じ「total」
 * 概念を 1 helper で共有。
 */
export function totalBucketCounts(counts: Readonly<Record<GtdBucket, number>>): number {
  return (Object.keys(counts) as GtdBucket[]).reduce((s, k) => s + counts[k], 0)
}

export function formatInboxBucketsJa<T extends InboxItemFields>(
  summary: InboxBucketSummary<T>,
): string {
  const total = totalBucketCounts(summary.counts)
  if (total === 0) return 'Inbox 0 件 (空)'
  const order: GtdBucket[] = [
    'immediate',
    'next-action',
    'project',
    'waiting-for',
    'reference',
    'someday',
    'scheduled',
    'trash',
  ]
  const sorted = order
    .filter((b) => summary.counts[b] > 0)
    .sort((a, b) => summary.counts[b] - summary.counts[a])
  const parts = sorted.map((b) => `${gtdBucketLabelJa(b)} ${summary.counts[b]}`)
  return `Inbox ${total} 件: ${parts.join(' / ')}`
}

/**
 * iter488 basics: Inbox 健全性 4 状態 hint (= GTD 流れの停滞度)。
 *
 * - 'idle'     : total=0 (= Inbox 完全 process 済)
 * - 'severe'   : waiting-for >= 5 件 (= 連絡待ち多発、blocked) OR total >= 100 (= 完全停滞)
 * - 'moderate' : total >= 30 件 (= process 滞留) OR immediate >= 5 (= 即実行待機 多)
 * - 'mild'     : それ以外 (= 健全に流れている)
 *
 * 用途: dashboard chip 「Inbox 健全性: 注意 (溜まってます)」、AI 朝 brief の見出し、
 * Slack 通知の severity 制御。
 */
import { type FourStateHint } from '@/lib/hint'

export type InboxHealthHint = FourStateHint

export function classifyInboxHealthHint<T extends InboxItemFields>(
  summary: InboxBucketSummary<T>,
): InboxHealthHint {
  const total = totalBucketCounts(summary.counts)
  if (total === 0) return 'idle'
  if (summary.counts['waiting-for'] >= 5 || total >= 100) return 'severe'
  if (total >= 30 || summary.counts.immediate >= 5) return 'moderate'
  return 'mild'
}

const INBOX_HEALTH_LABEL_JA: Record<InboxHealthHint, string> = {
  idle: '空 (process 済)',
  mild: '健全',
  moderate: '滞留気味',
  severe: '要 process',
}

export function formatInboxHealthHintJa<T extends InboxItemFields>(
  summary: InboxBucketSummary<T>,
): string {
  return INBOX_HEALTH_LABEL_JA[classifyInboxHealthHint(summary)]
}

/**
 * iter1046 basics: Inbox 健全性を `AgentBriefSignal` 形式 (text + tone) に変換する
 * compose helper。
 *
 * iter1025/1031/1035/1038/1040 等 `*ToBriefSignal` pattern (= 12+ axes 弾) の Inbox
 * 軸版で AI 朝 brief / Slack daily digest / dashboard chip area に 1 chip 渡せる。
 *
 *   - text: `formatInboxHealthHintJa(summary)` (= '空 (process 済)' / '健全' / '滞留気味' / '要 process')
 *   - tone: `classifyInboxHealthHint` → `fourStateHintToSeverity` → `severityToChipTone`
 *           (iter495 + iter1039 の 2 bridge を経由、'mild' → 'ok' → 'success' で
 *            healthy を positive framing)
 *
 *   'idle'     → 'idle'    (= 空、attention 不要)
 *   'mild'     → 'success' (= 健全、positive)
 *   'moderate' → 'warn'    (= 滞留気味)
 *   'severe'   → 'danger'  (= 要 process)
 *
 * caller pattern:
 *   const summary = summarizeInbox(inboxItems)
 *   const signal = inboxHealthToBriefSignal(summary)
 *   // → composeAnalyticsSignals 風に concat、または単独 chip render
 *
 * 用途:
 *   - GTD mode dashboard 上部の「Inbox 健全性」 chip
 *   - AI 朝 brief / Slack daily digest 「Inbox: 滞留気味」 signal
 *   - analytics-signals.ts の 13 軸目候補 (次 iter integration 想定)
 */
import { fourStateHintToSeverity, severityToChipTone } from '@/lib/widget/severity-bridges'

export function inboxHealthToBriefSignal<T extends InboxItemFields>(
  summary: InboxBucketSummary<T>,
): AgentBriefSignal {
  const hint = classifyInboxHealthHint(summary)
  const severity = fourStateHintToSeverity(hint)
  return {
    text: `Inbox: ${formatInboxHealthHintJa(summary)}`,
    tone: severityToChipTone(severity),
  }
}

/**
 * iter1048 basics: Inbox bucket counts → `AgentBriefSignal` の counts-only 版。
 *
 * `inboxHealthToBriefSignal` (iter1046) は `InboxBucketSummary<T>` (= items 込み) を取るが、
 * `classifyInboxHealthHint` / `formatInboxHealthHintJa` は内部で `summary.counts` しか
 * 使わない。analytics-signals.ts 統合 (= 13 軸目) で「items を持たず counts だけ」を
 * 渡したいケース (= 既に summarizeInbox 済 + caller が counts 抽出済み) のために
 * 軽量 wrapper を提供。
 *
 * caller pattern:
 *   const summary = summarizeInbox(inboxItems)
 *   const signal = inboxBucketCountsToBriefSignal(summary.counts)
 *   // または直接 counts を構築して渡す (= dashboard chip props 引き渡し向け)
 */
export type InboxBucketCounts = Readonly<Record<GtdBucket, number>>

export function inboxBucketCountsToBriefSignal(counts: InboxBucketCounts): AgentBriefSignal {
  // classifyInboxHealthHint / formatInboxHealthHintJa は summary.counts のみ使う。
  // 残 field (buckets / twoMinRuleSuggestions) は本 helper 内で参照されないため
  // 空 placeholder で型整合させる。
  const minimalSummary = {
    counts,
    buckets: {} as Record<GtdBucket, never[]>,
    twoMinRuleSuggestions: [] as never[],
  } satisfies InboxBucketSummary<InboxItemFields>
  return inboxHealthToBriefSignal(minimalSummary)
}
