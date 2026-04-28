'use client'

/**
 * Phase 6.15 iter 248 — TickTick 風 タスクタイマー Scope A UI (in-page floating panel)。
 *
 * 右下 fixed の小型 panel。Active timer (Zustand `useActiveTimerStore`) が立っていれば
 * 表示、null なら何も出さない。
 *
 * 機能:
 *   - 経過時間を 1s 刻みで描画 (running 中のみ tick、Date.now() ベースなので
 *     setInterval が間引かれても累積値は正しい)
 *   - Pause / Resume / Stop の 3 button
 *   - Stop で `time_entries` に自動 insert (`description=「タスク: <title>」`、
 *     `category='dev'` default、`durationMinutes=Math.max(1, Math.round(ms/60000))`)
 *   - Stop 後に store クリア (= panel が消える)
 *
 * デスクトップ風「常に手前」 (Document PiP) は Scope B で別 iter (FEEDBACK_QUEUE)。
 */
import { useEffect, useState } from 'react'

import { Pause, Play, Square } from 'lucide-react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'

import { todayISO } from '@/lib/date/iso'
import { isAppError } from '@/lib/errors'
import { formatElapsed, formatVariance, useActiveTimerStore } from '@/lib/stores/active-timer'

import { applyBiasCalibration } from '@/features/time-entry/bias-calibration'
import { useCreateTimeEntry } from '@/features/time-entry/hooks'
import { useEstimateCalibration } from '@/features/time-entry/use-estimate-calibration'

import { Button } from '@/components/ui/button'

interface Props {
  workspaceId: string
}

export function ActiveTimerPanel({ workspaceId }: Props) {
  const itemId = useActiveTimerStore((s) => s.itemId)
  const itemTitle = useActiveTimerStore((s) => s.itemTitle)
  const estimateMinutes = useActiveTimerStore((s) => s.estimateMinutes)
  const running = useActiveTimerStore((s) => s.running)
  const pause = useActiveTimerStore((s) => s.pause)
  const resume = useActiveTimerStore((s) => s.resume)
  const stopFn = useActiveTimerStore((s) => s.stop)
  const elapsedFn = useActiveTimerStore((s) => s.elapsedMs)
  const create = useCreateTimeEntry(workspaceId)
  // iter271 basics: 直近 bias の校正値を計算し、見積 chip 横に「→ 39分」を併記。
  // QuickAdd preview と同じ pattern (iter267)。delta=0 / factor=null は非表示。
  const { calibrationFactor } = useEstimateCalibration(workspaceId)
  const calibrated = estimateMinutes
    ? applyBiasCalibration(estimateMinutes, calibrationFactor)
    : null

  // 1 秒ごとに再 render (running 中のみ)。値 source は store の wall-clock 計算なので
  // tick ズレが起きても累積は正しい。
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [running])

  if (!itemId) return null

  const elapsedMs = elapsedFn()

  async function handleStop() {
    const result = stopFn()
    if (!result || result.elapsedMs <= 0) return
    const minutes = Math.max(1, Math.round(result.elapsedMs / 60_000))
    try {
      await create.mutateAsync({
        workspaceId,
        itemId: result.itemId,
        workDate: todayISO(),
        category: 'dev',
        description: `タスク: ${result.itemTitle || '(無題)'}`,
        durationMinutes: minutes,
        idempotencyKey: uuidv4(),
      })
      // iter254: estimate と比較して variance を bias 別 toast で通知。
      // bias=under → success / on → success / over → warning。
      const variance = formatVariance(minutes, result.estimateMinutes)
      const baseMsg = `稼働を記録しました: ${minutes} 分`
      const fullMsg = result.estimateMinutes ? `${baseMsg} — ${variance.message}` : baseMsg
      if (variance.bias === 'over') {
        toast.warning(fullMsg)
      } else {
        toast.success(fullMsg)
      }
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '稼働記録に失敗')
    }
  }

  return (
    <div
      className="bg-card fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-lg border px-3 py-2 shadow-lg"
      data-testid="active-timer-panel"
      role="region"
      aria-label={`タスクタイマー (経過 ${formatElapsed(elapsedMs)}${running ? ' 計測中' : ' 一時停止中'})`}
    >
      <div className="min-w-0">
        <div className="text-muted-foreground text-[10px]">
          タスク タイマー
          {estimateMinutes ? (
            <span
              className="ml-1 rounded bg-cyan-100 px-1 text-[9px] text-cyan-700"
              data-testid="active-timer-estimate"
              aria-label={`見積 ${estimateMinutes}分`}
            >
              見積 {estimateMinutes}分
            </span>
          ) : null}
          {calibrated && calibrated.deltaMinutes !== 0 ? (
            <span
              className="ml-1 rounded border border-cyan-200 bg-cyan-50 px-1 text-[9px] text-cyan-600"
              data-testid="active-timer-estimate-calibrated"
              title={`直近の見積精度に基づく校正値 (中央値 ${calibrationFactor?.toFixed(2)}×)`}
              aria-label={`校正後 ${calibrated.calibratedMinutes}分 (${calibrated.deltaMinutes > 0 ? '+' : ''}${calibrated.deltaMinutes}分)`}
            >
              → {calibrated.calibratedMinutes}分
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="max-w-[160px] truncate text-xs font-medium" title={itemTitle ?? ''}>
            {itemTitle || '(無題)'}
          </span>
          <span
            className="font-mono text-sm tabular-nums"
            data-testid="active-timer-elapsed"
            aria-live="polite"
            aria-atomic="true"
          >
            {formatElapsed(elapsedMs)}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {running ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={pause}
            aria-label="タイマーを一時停止"
            data-testid="active-timer-pause"
          >
            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={resume}
            aria-label="タイマーを再開"
            data-testid="active-timer-resume"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void handleStop()}
          disabled={create.isPending}
          aria-label={
            create.isPending
              ? 'タイマーを停止して稼働記録を作成中…'
              : 'タイマーを停止して稼働記録に保存'
          }
          data-testid="active-timer-stop"
        >
          <Square className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          停止
        </Button>
      </div>
    </div>
  )
}
