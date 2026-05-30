'use client'

/**
 * Phase 6.15 iter 248 — TickTick 風 タスクタイマー Scope A UI (in-page floating panel)。
 * Phase 6.15 iter 315 — Scope B: Document Picture-in-Picture で別 window 化 + 常に手前表示
 * (Chrome / Edge のみ、未対応 browser は button disabled + 理由 aria-label)。
 *
 * 右下 fixed の小型 panel。Active timer (Zustand `useActiveTimerStore`) が立っていれば
 * 表示、null なら何も出さない。
 *
 * 機能:
 *   - 経過時間を 1s 刻みで描画 (running 中のみ tick、Date.now() ベースなので
 *     setInterval が間引かれても累積値は正しい)
 *   - Pause / Resume / Stop / PiP 取り出し の 4 button
 *   - Stop で `time_entries` に自動 insert (`description=「タスク: <title>」`、
 *     `category='dev'` default、`durationMinutes=Math.max(1, Math.round(ms/60000))`)
 *   - Stop 後に store クリア (= panel が消える)
 *   - PiP: 別 window 化 + Tailwind 等の stylesheet を clone で見た目維持、
 *     Zustand store は親と共有 (関数 / 状態は createPortal で同 React tree)
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import { Pause, PictureInPicture2, Play, Square } from 'lucide-react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'

import {
  copyStylesheetsToWindow,
  isDocumentPipSupported,
  openDocumentPipWindow,
} from '@/lib/browser/document-pip'
import { todayISO } from '@/lib/date/iso'
import { isAppError } from '@/lib/errors'
import { formatElapsed, formatVariance, useActiveTimerStore } from '@/lib/stores/active-timer'

import { applyBiasCalibration } from '@/features/time-entry/bias-calibration'
import { useCreateTimeEntry } from '@/features/time-entry/hooks'
import { useEstimateCalibration } from '@/features/time-entry/use-estimate-calibration'

import { Button } from '@/components/ui/button'

// useSyncExternalStore 用の固定 identity 関数群 (capability は静的なので
// subscribe は no-op、snapshot は同期取得するだけ)。
const pipNoopSubscribe = () => () => {}
const pipClientSnapshot = () => isDocumentPipSupported()
const pipServerSnapshot = () => false

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

  // Document PiP 状態: 開いてる中の window 参照 (null = main panel 表示)。
  // capability 検出は useSyncExternalStore で SSR (false) / client (実検出) の
  // hydration mismatch を回避 (subscribe 不要なので no-op)。
  const [pipWindow, setPipWindow] = useState<Window | null>(null)
  const [pipPending, setPipPending] = useState(false)
  const pipSupported = useSyncExternalStore(pipNoopSubscribe, pipClientSnapshot, pipServerSnapshot)

  const closePip = useCallback(() => {
    setPipWindow((w) => {
      if (w && !w.closed) w.close()
      return null
    })
  }, [])

  // Item が変わったら PiP を閉じる (タイマー入れ替え時の混乱回避)。
  const lastItemIdRef = useRef(itemId)
  useEffect(() => {
    if (lastItemIdRef.current !== itemId) {
      lastItemIdRef.current = itemId
      closePip()
    }
  }, [itemId, closePip])

  // PiP window が外側 (×) で閉じられた時に parent state を戻す。
  useEffect(() => {
    if (!pipWindow) return
    const handlePageHide = () => setPipWindow(null)
    pipWindow.addEventListener('pagehide', handlePageHide)
    return () => {
      pipWindow.removeEventListener('pagehide', handlePageHide)
    }
  }, [pipWindow])

  async function handleOpenPip() {
    if (pipWindow || pipPending) return
    setPipPending(true)
    try {
      const win = await openDocumentPipWindow({ width: 320, height: 140 })
      if (!win) {
        toast.error('Picture-in-Picture を開けませんでした')
        return
      }
      copyStylesheetsToWindow(win)
      win.document.title = 'タスク タイマー'
      setPipWindow(win)
    } finally {
      setPipPending(false)
    }
  }

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

  const inPip = pipWindow !== null
  // PiP 中は full-window 中央寄せ (320×140 想定)。in-page は右下 fixed 小型 panel。
  // iter1024: mobile 320px viewport で panel 内容 width が 364px に膨らみ、
  // `fixed right-4 bottom-4` の panel.left が -60px (viewport 左端を超える) になっていた。
  // `max-w-[calc(100vw-2rem)]` で右 16px + 左 16px margin を引いた viewport 内に常時収め、
  // mobile で panel が画面外に切れる事故を防ぐ。
  const containerClass = inPip
    ? 'bg-card flex h-full w-full items-center gap-2 px-3 py-2'
    : 'bg-card fixed right-4 bottom-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-lg border px-3 py-2 shadow-lg'

  const body = (
    <div
      className={containerClass}
      data-testid="active-timer-panel"
      data-pip={inPip ? 'true' : 'false'}
      role="region"
      aria-label={`タスクタイマー (経過 ${formatElapsed(elapsedMs)}${running ? ' 計測中' : ' 一時停止中'})`}
    >
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground text-[10px]">
          {/* iter922: parent region aria-label "タスクタイマー (経過 ${X} 計測中|一時停止中)"
              が prefix 同梱、視覚 label "タスク タイマー" は二重読み上げ →
              aria-hidden span で wrap、aria-label 単独 SR 経路に集約 (iter918-921 続編)。
              estimate / calibrated chip は独立 aria-label を持つため visible のまま。 */}
          <span aria-hidden="true">タスク タイマー</span>
          {estimateMinutes ? (
            // iter1056: role 無 span + aria-label を `role="img"` で authoritative 化
            // (iter1023/1049-1055 同 pattern、隣の calibrated chip と同 role=img に揃え)。
            <span
              // iter1521: estimate chip は light 固定で iter1376/1493/1512-1519 dark chip
              // sweep からこぼれていた。dark variant 補完。
              className="ml-1 rounded bg-cyan-100 px-1 text-[9px] text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300"
              data-testid="active-timer-estimate"
              role="img"
              aria-label={`見積 ${estimateMinutes}分`}
            >
              <span aria-hidden="true">見積 {estimateMinutes}分</span>
            </span>
          ) : null}
          {calibrated && calibrated.deltaMinutes !== 0 ? (
            // iter440: title= は mouse hover only で SR / keyboard 不可達。aria-label
            // に校正値 + 中央値の factor 情報を集約 (factor は SR ユーザにも価値ある
            // signal、データ source の透明性 UX)。
            <span
              className="ml-1 rounded border border-cyan-200 bg-cyan-50 px-1 text-[9px] text-cyan-600 dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-300"
              data-testid="active-timer-estimate-calibrated"
              role="img"
              aria-label={`校正後 ${calibrated.calibratedMinutes}分 — ${calibrated.deltaMinutes > 0 ? '+' : ''}${calibrated.deltaMinutes}分、中央値 ${calibrationFactor?.toFixed(2)}× 補正`}
            >
              <span aria-hidden="true">→ {calibrated.calibratedMinutes}分</span>
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`max-w-[160px] truncate font-medium ${inPip ? 'text-sm' : 'text-xs'}`}
            title={itemTitle || undefined}
          >
            {itemTitle || '(無題)'}
          </span>
          {/*
            aria-live は意図的に外す: 1 秒 tick で更新されるため "polite" でも
            queue が連続発火し SR が「00:01 00:02 00:03 ...」を読み続ける
            (a11y アンチパターン)。コンテナ側 `role="region"` の `aria-label`
            に経過時間を含めてあるので SR ユーザは region にナビゲートすれば
            on-demand に最新値を聞ける。
          */}
          <span
            className={`font-mono tabular-nums ${inPip ? 'text-base' : 'text-sm'}`}
            data-testid="active-timer-elapsed"
            aria-hidden="true"
          >
            {formatElapsed(elapsedMs)}
          </span>
        </div>
      </div>
      <div
        className="flex shrink-0 items-center gap-1"
        role="group"
        aria-label={`タスクタイマーの操作 (現在: ${running ? '計測中' : '一時停止中'}、一時停止 / 再開 / Picture-in-Picture / 停止)`}
      >
        {/* iter1024: icon-only buttons (Pause / Play / PictureInPicture2) は size="sm" +
            `min-h-11` で高さ 44px は満たすが、幅は icon 12px + padding = 36px で
            44x44 WCAG 2.5.5 違反だった。`min-w-11` (44px) で両軸 satisfy。 */}
        {running ? (
          <Button
            type="button"
            size="sm"
            className="min-h-11 min-w-11"
            variant="ghost"
            onClick={pause}
            // iter1222: icon-only Pause button (visible text 無)。旧 aria-label "タイマーを
            // 一時停止" は voice control「click 一時停止」 prefix-match 不可 ("タイマーを"
            // が先頭)。BulkCheckbox iter1220 と同 sweep を active-timer pause / resume / pip
            // にも展開、概念名を冒頭固定 + em-dash 区切で descriptive 末尾保持。
            aria-label="一時停止 — タイマーを一時停止"
            data-testid="active-timer-pause"
          >
            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="min-h-11 min-w-11"
            variant="ghost"
            onClick={resume}
            // iter1222: pause button と同 sweep — visible text 無 icon-only で概念名 "再開"
            // を冒頭固定。
            aria-label="再開 — タイマーを再開"
            data-testid="active-timer-resume"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          className="min-h-11 min-w-11"
          variant="ghost"
          onClick={inPip ? closePip : () => void handleOpenPip()}
          disabled={!pipSupported || pipPending}
          aria-busy={pipPending || undefined}
          // iter1222: pause / resume と同 sweep — visible text 無 icon-only PiP button。
          // 4 path のうち default path だけ visible "常に手前表示で別 window 化 (...)" で
          // 概念名 "Picture-in-Picture" が末尾 () 内に divergence、voice control
          // 「click Picture-in-Picture」 prefix-match 不可。他 3 path は既に "Picture-in-Picture"
          // 冒頭 OK だったため default のみ修正、4 path 全部冒頭 "Picture-in-Picture" 統一。
          aria-label={
            !pipSupported
              ? 'Picture-in-Picture は Chrome / Edge で利用可能'
              : inPip
                ? 'Picture-in-Picture を閉じてページに戻す'
                : pipPending
                  ? 'Picture-in-Picture を開いています…'
                  : 'Picture-in-Picture — 常に手前表示で別 window 化'
          }
          title={
            !pipSupported
              ? 'Chrome / Edge で利用可能'
              : inPip
                ? 'PiP を閉じる'
                : '常に手前表示で取り出す'
          }
          data-testid="active-timer-pip"
        >
          <PictureInPicture2 className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        {/* iter1101: visible "停止" が aria-label "タイマーを停止して..." の "タイマーを**停止**して"
            位置 (= prefix で無く middle) に substring としてあり voice control prefix-matching で
            「click 停止」 match 不可。iter1093-1100 sweep convention に合わせ visible 冒頭固定。 */}
        <Button
          type="button"
          size="sm"
          className="min-h-11"
          variant="outline"
          onClick={() => void handleStop()}
          disabled={create.isPending}
          aria-busy={create.isPending || undefined}
          aria-label={
            create.isPending
              ? '停止 — タイマーを停止して稼働記録を作成中…'
              : '停止 — タイマーを停止して稼働記録に保存'
          }
          data-testid="active-timer-stop"
        >
          <Square className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          <span aria-hidden="true">停止</span>
        </Button>
      </div>
    </div>
  )

  if (inPip && pipWindow.document.body) {
    return createPortal(body, pipWindow.document.body)
  }

  return body
}
