/**
 * Phase 6.15 iter 247 — TickTick 風 タスクタイマー (Scope A: in-page 常駐タイマー)。
 *
 * `Item` 1 件に対して「計測中」状態を 1 つ持つ Zustand store。
 *
 * 設計判断:
 *   - **計測値は wall-clock (Date.now()) ベース**。setInterval が backgroud で
 *     間引かれても狂わないよう、`startedAt` と pause 時の `pausedAccumulatedMs` を
 *     保持し、必要時に「現在 ms = (Date.now() - startedAt) + pausedAccumulatedMs」を
 *     計算する。
 *   - 1 タイマー / 1 アクティブ Item のみ。新しい Item で start すると現在の
 *     タイマーは Stop (= time_entry に書き込み) してから入れ替わる (caller 責務、
 *     store は state のみ管理)。
 *   - **localStorage 永続化** で reload 跨ぎ継続。Zustand persist middleware を
 *     使うが、persist 対象は `running` `paused` `startedAt` `accumulatedMs`
 *     `itemId` `itemTitle` のみ (関数 / Date 等は serializable に保つ)。
 *   - mode は 'stopwatch' (free run) のみで MVP 開始。Pomodoro (25/5min) は
 *     iter で別 scope (FEEDBACK_QUEUE.md "TickTick タイマー" の Scope C)。
 *
 * UI 側 (floating panel) は別 component で本 store を購読する (iter で別途)。
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TimerMode = 'stopwatch' | 'pomodoro'

export interface ActiveTimerState {
  /** 計測中 Item の ID。null なら待機中 */
  itemId: string | null
  /** UI 表示用の Item title (serializable) */
  itemTitle: string | null
  /** 現在動いている? (paused なら false、running なら true) */
  running: boolean
  /** 動き出した時刻 (Date.now() ms)。null なら停止中 */
  startedAt: number | null
  /** 過去の pause で蓄積された ms (running 中は加算されず、再開時に startedAt と合算される) */
  pausedAccumulatedMs: number
  /** モード (現状 stopwatch のみ、Pomodoro は POST_MVP) */
  mode: TimerMode

  /** Item を指定してタイマー開始 (既存タイマーがあれば呼出し側で stop しておく) */
  start: (input: { itemId: string; itemTitle: string; mode?: TimerMode }) => void
  /** 一時停止 (累積値は保持) */
  pause: () => void
  /** 再開 (paused → running) */
  resume: () => void
  /** 停止 → state クリア。caller が elapsed ms を取って time_entries に書き込む */
  stop: () => { itemId: string; itemTitle: string; elapsedMs: number } | null
  /** 計測中かどうか (running or paused) */
  isActive: () => boolean
  /** 現在までの累積 ms (paused 中の値も足す) */
  elapsedMs: () => number
}

export const useActiveTimerStore = create<ActiveTimerState>()(
  persist(
    (set, get) => ({
      itemId: null,
      itemTitle: null,
      running: false,
      startedAt: null,
      pausedAccumulatedMs: 0,
      mode: 'stopwatch',

      start: ({ itemId, itemTitle, mode = 'stopwatch' }) => {
        set({
          itemId,
          itemTitle,
          running: true,
          startedAt: Date.now(),
          pausedAccumulatedMs: 0,
          mode,
        })
      },

      pause: () => {
        const { running, startedAt, pausedAccumulatedMs } = get()
        if (!running || startedAt === null) return
        const now = Date.now()
        set({
          running: false,
          startedAt: null,
          pausedAccumulatedMs: pausedAccumulatedMs + (now - startedAt),
        })
      },

      resume: () => {
        const { running, itemId } = get()
        if (running || itemId === null) return
        set({ running: true, startedAt: Date.now() })
      },

      stop: () => {
        const { itemId, itemTitle, running, startedAt, pausedAccumulatedMs } = get()
        if (itemId === null) return null
        const now = Date.now()
        const elapsedMs =
          pausedAccumulatedMs + (running && startedAt !== null ? now - startedAt : 0)
        set({
          itemId: null,
          itemTitle: null,
          running: false,
          startedAt: null,
          pausedAccumulatedMs: 0,
        })
        return { itemId, itemTitle: itemTitle ?? '', elapsedMs }
      },

      isActive: () => get().itemId !== null,

      elapsedMs: () => {
        const { running, startedAt, pausedAccumulatedMs } = get()
        if (running && startedAt !== null) {
          return pausedAccumulatedMs + (Date.now() - startedAt)
        }
        return pausedAccumulatedMs
      },
    }),
    {
      name: 'saikyo-active-timer',
      partialize: (s) => ({
        itemId: s.itemId,
        itemTitle: s.itemTitle,
        running: s.running,
        startedAt: s.startedAt,
        pausedAccumulatedMs: s.pausedAccumulatedMs,
        mode: s.mode,
      }),
    },
  ),
)

/** ms → "HH:MM:SS" / "MM:SS" 表示用 (UI 共通)。 */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hh = Math.floor(total / 3600)
  const mm = Math.floor((total % 3600) / 60)
  const ss = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`
}
