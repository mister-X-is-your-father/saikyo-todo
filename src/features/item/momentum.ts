/**
 * iter339 ai-automation: workspace の「モメンタム」 (intake vs done) を 1 関数で
 * 判定する pure helper。
 *
 * iter302 velocity (done 件数のペース、7 日 window) は片側だけだったが、本 helper
 * は同じ window で **intake (createdAt 件数) と done (doneAt 件数) を両方計測** し、
 * net = intake - done を「成長中 / 縮小中 / 安定」 に分類する。AI brief / pm-agent /
 * dashboard widget が「backlog は成長中 (週 +3 件)」「縮小中 (-2 件)」のような
 * トレンドを 1 関数で提示できる。
 *
 * iter312 period-completion (期間 × itemsCompleted/itemsAdded、合算) と被るが、
 * period-completion は単一期間の集計、本 helper は window N 日固定 + momentum 判定
 * (direction + threshold) に特化。
 *
 * 仕様:
 *   - input: items 配列 ({createdAt, doneAt} の structural subset)
 *   - options.windowDays default 7、(today - windowDays + 1) ≤ X ≤ today を window
 *   - intake: window 内に createdAt がある件数
 *   - done: window 内に doneAt がある件数
 *   - net = intake - done (正 = 成長中、負 = 縮小中)
 *   - momentum:
 *       - intake=done=0 → 'idle' (活動なし)
 *       - |net| / max(1, intake+done) < 0.2 (= 20%) → 'balanced'
 *       - net > 0 → 'growing' (intake > done = backlog 増)
 *       - net < 0 → 'shrinking' (done > intake = backlog 減)
 *
 * 不正 createdAt / doneAt は除外 (fail-soft)、windowDays<=0 で空 result、today
 * 不正で idle。
 */

import { parseDateOrNull } from '@/lib/date/iso'

export interface MomentumFields {
  createdAt: Date | string | null | undefined
  doneAt: Date | string | null | undefined
}

export type MomentumDirection = 'growing' | 'shrinking' | 'balanced' | 'idle'

export interface WorkspaceMomentum {
  intake: number
  done: number
  /** intake - done (正 = 成長、負 = 縮小) */
  net: number
  direction: MomentumDirection
  /** 集計に使った日数 (= windowDays clamped to 1..) */
  windowDays: number
}

export interface ComputeMomentumOptions {
  /** 集計対象日数。default 7。0 以下で空 result */
  windowDays?: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const BALANCED_THRESHOLD = 0.2

function emptyResult(windowDays: number): WorkspaceMomentum {
  return { intake: 0, done: 0, net: 0, direction: 'idle', windowDays }
}

export function computeWorkspaceMomentum<T extends MomentumFields>(
  items: readonly T[],
  options: ComputeMomentumOptions = {},
  today: Date | string = new Date(),
): WorkspaceMomentum {
  const windowDays = options.windowDays ?? 7
  if (windowDays <= 0) return emptyResult(0)

  const todayDate = parseDateOrNull(today)
  if (!todayDate) return emptyResult(windowDays)

  // window 開始日 (today - windowDays + 1 の 00:00 ローカル深夜)
  const windowStartMs = todayDate.getTime() - (windowDays - 1) * MS_PER_DAY
  // window 終了は today の 23:59:59 (todayDate がローカル真夜中前提だと +1 day - 1ms)
  const windowEndMs = todayDate.getTime() + MS_PER_DAY - 1

  let intake = 0
  let done = 0
  for (const it of items) {
    const created = parseDateOrNull(it.createdAt)
    if (created && created.getTime() >= windowStartMs && created.getTime() <= windowEndMs) {
      intake += 1
    }
    const doneAt = parseDateOrNull(it.doneAt)
    if (doneAt && doneAt.getTime() >= windowStartMs && doneAt.getTime() <= windowEndMs) {
      done += 1
    }
  }

  const net = intake - done
  let direction: MomentumDirection
  if (intake === 0 && done === 0) {
    direction = 'idle'
  } else {
    const total = intake + done
    const ratio = Math.abs(net) / Math.max(1, total)
    if (ratio < BALANCED_THRESHOLD) {
      direction = 'balanced'
    } else if (net > 0) {
      direction = 'growing'
    } else if (net < 0) {
      direction = 'shrinking'
    } else {
      direction = 'balanced'
    }
  }

  return { intake, done, net, direction, windowDays }
}

/**
 * AI prompt 用 1 行サマリ:
 *   `'モメンタム: 直近 7 日 +3 件 成長中 (新規 12 / 完了 9)'`
 *   `'モメンタム: 直近 7 日 -2 件 縮小中 (新規 5 / 完了 7)'`
 *   `'モメンタム: 直近 7 日 安定 (新規 6 / 完了 6)'`
 *   `'モメンタム: 直近 7 日 活動なし'`
 */
export function formatWorkspaceMomentumJa(m: WorkspaceMomentum): string {
  const head = `モメンタム: 直近 ${m.windowDays} 日`
  if (m.direction === 'idle') return `${head} 活動なし`
  const counts = `(新規 ${m.intake} / 完了 ${m.done})`
  if (m.direction === 'balanced') return `${head} 安定 ${counts}`
  const sign = m.net > 0 ? '+' : ''
  const labelMap: Record<Exclude<MomentumDirection, 'idle' | 'balanced'>, string> = {
    growing: '成長中',
    shrinking: '縮小中',
  }
  return `${head} ${sign}${m.net} 件 ${labelMap[m.direction]} ${counts}`
}
