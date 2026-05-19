/**
 * iter337 ai-automation: Item を `createdAt` ベースの「年齢バケット」に分類する pure helper。
 *
 * iter287 due-proximity (dueDate ベース「期限近接バケット」) と対称な「intake 年齢」軸。
 * AI 朝 brief / pm-agent / dashboard widget が「backlog の構成: 新規 3 / 直近 5 /
 * 停滞 8 / 古参 12」を 1 関数で取り出せる substrate。stale-items (iter299、
 * updatedAt ベース「放置」) と相補で、こちらは createdAt ベース「いつ作られたか」。
 *
 * バケット仕様 (5 段階、若い順):
 *  - `new`     — createdAt が今日 (ageDays < 1)
 *  - `recent`  — 1 ≤ ageDays < 7 (= 1 週間以内)
 *  - `stale`   — 7 ≤ ageDays < 30 (= 1 ヶ月以内)
 *  - `ancient` — ageDays >= 30 (= 1 ヶ月以上)
 *  - `unknown` — createdAt が null / 不正 (= 集計除外用 sentinel)
 *
 * 注意:
 *  - 完了 (doneAt) / archive 済 (archivedAt) も含むので、caller が backlog だけに
 *    絞りたい場合は事前 filter してから渡すこと
 *  - `today` は Date or 'YYYY-MM-DD' or RFC3339、未指定 → new Date() (端末ローカル TZ)
 *  - 不正 createdAt は `unknown` に集約 (= 「年齢不明」、件数だけは取れる)
 *  - `ageDays` は `Math.floor((today - createdAt) / 1日)`、createdAt=今日なら 0、
 *    未来 createdAt (時計ズレ) は ageDays=0 / kind='new' (clamp)
 */

import { MS_PER_DAY, parseDateOrNull } from '@/lib/date/iso'
import { formatNonZeroCounts } from '@/lib/format-counts'
import { makeHintLabelFormatter } from '@/lib/hint'

import { bucketByPriorityWith, formatPriorityBucketsLabeled, type PriorityKey } from './priority'

export type AgingKind = 'new' | 'recent' | 'stale' | 'ancient' | 'unknown'

const KIND_ORDER: readonly AgingKind[] = ['new', 'recent', 'stale', 'ancient', 'unknown'] as const

const LABEL: Record<AgingKind, string> = {
  new: '新規',
  recent: '直近',
  stale: '停滞',
  ancient: '古参',
  unknown: '年齢不明',
}

export interface ItemAge {
  kind: AgingKind
  /** 'YYYY-MM-DD' (today) からの経過日数 (床関数)、unknown は undefined */
  ageDays: number | undefined
  /** 日本語 短ラベル */
  label: string
}

function classifyAgeDays(ageDays: number): AgingKind {
  if (ageDays < 1) return 'new'
  if (ageDays < 7) return 'recent'
  if (ageDays < 30) return 'stale'
  return 'ancient'
}

export function getItemAge(
  createdAt: Date | string | null | undefined,
  today: Date | string = new Date(),
): ItemAge {
  const todayDate = parseDateOrNull(today)
  const createdDate = parseDateOrNull(createdAt)
  if (!todayDate || !createdDate) {
    return { kind: 'unknown', ageDays: undefined, label: LABEL.unknown }
  }
  // 未来 createdAt (時計ズレ等) は ageDays=0 (clamp) → new バケット
  const rawDays = Math.max(
    0,
    Math.floor((todayDate.getTime() - createdDate.getTime()) / MS_PER_DAY),
  )
  const kind = classifyAgeDays(rawDays)
  return { kind, ageDays: rawDays, label: LABEL[kind] }
}

/** UI で「新規」「直近」等の短ラベルを取り出すための糖衣。 */
export function agingLabel(kind: AgingKind): string {
  return LABEL[kind]
}

/**
 * iter400 refactor: items 群の最古 ageDays を返す reduce helper。
 * `aged-hygiene-debt.ts` / `stale-urgent.ts` (formatStaleUrgentJa /
 * computeStaleUrgentByPriority) の 3 callsite で同じ「null init → max-update」
 * pattern を inline で書いていたのを 1 関数に集約。
 *
 * 仕様:
 *   - 入力: items + (option) today
 *   - 出力: 最古 ageDays (整数、床関数)、空配列 / 全 createdAt 不正 → null
 *   - createdAt 不正 ('unknown' 判定) は skip (max 計算に含めない)
 *   - 未来 createdAt は ageDays=0 (getItemAge の clamp 仕様)
 */
export function oldestAgeDaysOf<T extends { createdAt: Date | string | null | undefined }>(
  items: readonly T[],
  today: Date | string = new Date(),
): number | null {
  let oldest: number | null = null
  for (const it of items) {
    const { ageDays } = getItemAge(it.createdAt, today)
    if (ageDays === undefined) continue
    if (oldest === null || ageDays > oldest) oldest = ageDays
  }
  return oldest
}

export type AgingGroups<T> = Record<AgingKind, T[]>

/**
 * items を年齢バケット別の配列に振り分ける。元配列順を保つ stable group。
 * 各 kind は必ず空配列で初期化される (`groups.ancient.length` の undefined check 不要)。
 */
export function groupItemsByAge<T extends { createdAt: Date | string | null | undefined }>(
  items: readonly T[],
  today: Date | string = new Date(),
): AgingGroups<T> {
  const groups: AgingGroups<T> = {
    new: [],
    recent: [],
    stale: [],
    ancient: [],
    unknown: [],
  }
  for (const it of items) {
    const { kind } = getItemAge(it.createdAt, today)
    groups[kind].push(it)
  }
  return groups
}

/** items を年齢バケット別の件数だけに圧縮。AI prompt 1 行用。 */
export function countItemsByAge(
  items: readonly { createdAt: Date | string | null | undefined }[],
  today: Date | string = new Date(),
): Record<AgingKind, number> {
  const counts = {
    new: 0,
    recent: 0,
    stale: 0,
    ancient: 0,
    unknown: 0,
  } satisfies Record<AgingKind, number>
  for (const it of items) {
    const { kind } = getItemAge(it.createdAt, today)
    counts[kind] += 1
  }
  return counts
}

/**
 * AI prompt 行 / dashboard chip 用の 1 行 summary (件数 0 の bucket は省略)。
 * 例: `'新規 3 / 直近 5 / 停滞 8 / 古参 12'`、全 0 → `'0 件'`。
 */
export function formatAgingCounts(counts: Readonly<Record<AgingKind, number>>): string {
  return formatNonZeroCounts(counts, KIND_ORDER, LABEL)
}

/**
 * 「stale + ancient (= 7 日以上)」の合算。AI brief「停滞気味 N 件」を 1 関数で。
 * unknown は集計に含めない (年齢が判定できないので bias の話に組み込めない)。
 */
export function countAgingItemsOlderThanWeek(counts: Readonly<Record<AgingKind, number>>): number {
  return counts.stale + counts.ancient
}

/**
 * iter1018 basics: aging counts の severity 4 段分類 (chip tone bind / Slack 通知 gate)。
 *
 * iter944 retroCompletionSeverity / iter1013 cycleCheckSeverity / iter1016
 * agedHygieneDebtSeverity と並ぶ「4 段 severity 分類」 pattern の backlog-aging 軸版。
 *
 * 仕様:
 *   - ancient >= 5 → 'danger' (= 30+ 日 5 件以上、要 sweep)
 *   - ancient >= 1 || stale >= 5 → 'warn' (= 30+ 日 1 件 or 7-30 日 5 件以上)
 *   - stale >= 1 → 'info' (= 7-30 日 1 件以上、軽い停滞)
 *   - 全て new/recent (= < 7 日) → 'ok' (= 全 active 新鮮)
 *   - 全 0 (= 集計対象なし) も 'ok'
 *
 * unknown は severity 判定に含めない (= 年齢不明、停滞かどうか判断できない)。
 *
 * 用途: dashboard chip 配色 / Slack 通知「stale backlog alert」 / AI prompt context。
 */
export type AgingSeverity = 'ok' | 'info' | 'warn' | 'danger'

export function agingSeverity(counts: Readonly<Record<AgingKind, number>>): AgingSeverity {
  if (counts.ancient >= 5) return 'danger'
  if (counts.ancient >= 1) return 'warn'
  if (counts.stale >= 5) return 'warn'
  if (counts.stale >= 1) return 'info'
  return 'ok'
}

/**
 * iter389 ai-automation: priority 別の `countItemsByAge` を計算する pure helper。
 *
 * iter344 due-hit-rate / iter362 dod-coverage / iter364 due-date-coverage /
 * iter372 combined-hygiene / iter382 hygiene-debt / iter387 slip-days と
 * 並ぶ「× priority」軸 7 弾目。「P1 が古参 3 件」のように 高優先軸の停滞を
 * 分離して可視化できる substrate。低優先 backlog の積み残しは想定内、
 * 高優先 backlog の積み残しは要注意 = 異常検出に使える。
 */
export interface AgingByPriorityFields {
  createdAt: Date | string | null | undefined
  priority: number | null | undefined
}

export type AgingByPriority = Record<PriorityKey, Record<AgingKind, number>>

export function countItemsByAgeByPriority<T extends AgingByPriorityFields>(
  items: readonly T[],
  today: Date | string = new Date(),
): AgingByPriority {
  return bucketByPriorityWith(items, (group) => countItemsByAge(group, today))
}

/**
 * AI prompt 用 1 行サマリ (priority 別 + ancient/stale 合算):
 *   `'停滞: P1 3 件 / P3 5 件'`
 *
 * stale + ancient が 0 件の priority は省略。全 P で 0 → `'停滞 0 件'`。
 */
export function formatAgingByPriorityJa(byPriority: AgingByPriority): string {
  return formatPriorityBucketsLabeled(
    byPriority,
    (k, counts) => {
      const stagnant = counts.stale + counts.ancient
      return stagnant === 0 ? null : `P${k} ${stagnant} 件`
    },
    '停滞',
    '停滞 0 件',
  )
}

/**
 * iter447 ai-automation: backlog-aging の severity を「1 word」で表現する hint helper。
 *
 * iter424 (descendants-activity-hint) / iter439 (blocked-items-hint) / iter442
 * (at-risk-parents-hint) / iter444 (parent-items-progress-hint) と並ぶ「item axis
 * 1-word state」シリーズの backlog-aging 軸版 (5 弾目)。AI 朝 brief / pm-agent /
 * dashboard chip / Slack 通知が「backlog の停滞度合い」を 1 word で出せる substrate。
 *
 * 4 状態 (stagnant = stale + ancient / ancient counts):
 *  - 'fresh'     → '新鮮 (停滞なし)'    (stagnant === 0)
 *  - 'mild'      → '軽微停滞'            (stagnant 1-4 かつ ancient < 3)
 *  - 'moderate'  → '停滞多め'            (stagnant ≥ 5 または ancient 3-4)
 *  - 'severe'    → '深刻 (古参累積)'    (ancient ≥ 5)
 *
 * caller benefits:
 *  - dashboard backlog-aging chip glyph / tone を hint base で決める
 *  - Slack 朝 brief 1 行 status (severe で「ancient 5+ 件累積」警告)
 *  - AI prompt 1 word 状況把握 / formatAgingByPriorityJa (priority 別) と相補
 */
export type BacklogAgingHint = 'fresh' | 'mild' | 'moderate' | 'severe'

export function classifyBacklogAgingHint(
  counts: Readonly<Record<AgingKind, number>>,
): BacklogAgingHint {
  const stagnant = counts.stale + counts.ancient
  if (stagnant === 0) return 'fresh'
  if (counts.ancient >= 5) return 'severe'
  if (stagnant >= 5 || counts.ancient >= 3) return 'moderate'
  return 'mild'
}

const HINT_LABEL_JA: Record<BacklogAgingHint, string> = {
  fresh: '新鮮 (停滞なし)',
  mild: '軽微停滞',
  moderate: '停滞多め',
  severe: '深刻 (古参累積)',
}

export const formatBacklogAgingHintJa = makeHintLabelFormatter(
  classifyBacklogAgingHint,
  HINT_LABEL_JA,
)
