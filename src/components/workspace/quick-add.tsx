'use client'

import { useMemo, useState } from 'react'

import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useDecomposeItem } from '@/features/agent/hooks'
import { formatFriendlyDate } from '@/features/item/date-tokens'
import { formatEstimate } from '@/features/item/estimate'
import { useCreateItem } from '@/features/item/hooks'
import { parseQuickAdd } from '@/features/item/nl-parse'
import { applyBiasCalibration } from '@/features/time-entry/bias-calibration'
import { useEstimateCalibration } from '@/features/time-entry/use-estimate-calibration'

import { IMEInput } from '@/components/shared/ime-input'
import { Button } from '@/components/ui/button'
import { MustBadge } from '@/components/workspace/must-badge'

// iter1518: PRIO_COLOR 4 階調は light 固定で dark mode で 明色 chip 浮き contrast 不適。
// iter1376/1493/1512-1517 chip dark variant pattern を本 PRIO chip にも展開。
const PRIO_COLOR: Record<number, string> = {
  1: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  2: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  3: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  4: 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
}

/**
 * 1 行 TODO クイック追加。
 *   - 入力中に nl-parse の結果を右に chip で preview
 *   - Enter (IME 無視) で create
 *   - 末尾 `?` で Researcher decompose を enqueue (parse.decomposeHint=true)
 */
export function QuickAdd({ workspaceId }: { workspaceId: string }) {
  const [text, setText] = useState('')
  const create = useCreateItem(workspaceId)
  const decompose = useDecomposeItem(workspaceId)
  // iter267 ai-automation: 直近 bias の calibrationFactor を取得し、見積入力時に
  // 「30分 → 39分 (校正)」をリアルタイム inline で表示する。
  const { calibrationFactor } = useEstimateCalibration(workspaceId)

  const preview = useMemo(
    () => (text.trim() ? parseQuickAdd(text, { today: new Date() }) : null),
    [text],
  )

  // preview 確定 + estimate あり + factor あり (= 3 sample 以上 + delta != 0) なら校正値を計算
  const calibrated = useMemo(
    () =>
      preview?.estimateMinutes
        ? applyBiasCalibration(preview.estimateMinutes, calibrationFactor)
        : null,
    [preview, calibrationFactor],
  )

  /**
   * preview chip 状態を SR 向け一文に集約 (aria-live で読み上げる対象)。
   * "予定: 2026-04-28 / 優先度: 最優先 / タグ: 会議 / 担当: alice / MUST / AI 分解候補"
   */
  const previewSummary = useMemo(() => {
    if (!preview || !preview.title) return ''
    const parts: string[] = []
    if (preview.scheduledFor) {
      parts.push(`予定: ${preview.scheduledFor}${preview.dueTime ? ` ${preview.dueTime}` : ''}`)
    }
    if (preview.priority) parts.push(`優先度 p${preview.priority}`)
    if (preview.tags.length > 0) parts.push(`タグ: ${preview.tags.join(', ')}`)
    if (preview.assignees.length > 0) parts.push(`担当: ${preview.assignees.join(', ')}`)
    if (preview.estimateMinutes) parts.push(`見積: ${formatEstimate(preview.estimateMinutes)}`)
    if (preview.isMust) parts.push('MUST')
    if (preview.decomposeHint) parts.push('AI 分解候補')
    return parts.length > 0 ? parts.join(' / ') : 'なし'
  }, [preview])

  async function submit() {
    if (!preview || !preview.title) return
    if (preview.isMust) {
      // MUST + DoD 必須制約 — QuickAdd では DoD が無いので case 先送り
      toast.error('MUST を使うには編集ダイアログで DoD を入れてください')
      return
    }
    try {
      // iter254: 見積 (estimateMinutes) があれば description に注記する。
      // schema に estimate 専用列がまだ無いので、description プレフィクスで保存
      // → 後続 iter で timer Stop 時の actual と比較する variance UX に使う。
      const description = preview.estimateMinutes
        ? `見積: ${formatEstimate(preview.estimateMinutes)}`
        : ''
      const created = await create.mutateAsync({
        workspaceId,
        title: preview.title,
        description,
        status: 'todo',
        priority: preview.priority ?? 4,
        isMust: false,
        dueDate: preview.dueDate ?? null,
        dueTime: preview.dueTime ?? null,
        scheduledFor: preview.scheduledFor ?? null,
        idempotencyKey: crypto.randomUUID(),
      })
      setText('')
      // Phase 6.15 iter 231: 末尾 `?` で AI 分解を fire-and-forget で起動。
      // toast.success は即時表示し、分解結果 (子タスク作成) は items realtime で非同期に反映。
      // 失敗しても作成自体は成功しているので警告 toast のみ。
      if (preview.decomposeHint && created?.id) {
        toast.success(`作成しました — Researcher が「${preview.title}」を分解中…`)
        void decompose
          .mutateAsync({ workspaceId, itemId: created.id })
          .then((r) => {
            const proposed = r.toolCalls.filter((c) => c.name === 'propose_child_item').length
            const made = r.toolCalls.filter((c) => c.name === 'create_item').length
            if (proposed > 0) {
              toast.success(`AI 分解完了 — 提案 ${proposed} 件 (子タスクタブで確認)`)
            } else if (made > 0) {
              toast.success(`AI 分解完了 (子 ${made} 件作成)`)
            } else {
              toast.success('AI 分解完了')
            }
          })
          .catch((err) => {
            toast.warning(isAppError(err) ? `AI 分解失敗: ${err.message}` : 'AI 分解に失敗しました')
          })
      } else {
        toast.success('作成しました')
      }
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '作成に失敗しました')
    }
  }

  return (
    <div className="space-y-2" data-testid="quick-add">
      <div className="flex gap-2">
        <IMEInput
          id="quick-add-input"
          placeholder='例: "明日15時 p1 #会議 1時間 打ち合わせ準備"  (Enter で作成)'
          aria-keyshortcuts="Enter"
          aria-label={
            text.length > 480
              ? `クイック追加 — タスクをすばやく作成 (現在 ${text.length} / 500 文字、上限近接、Enter で確定)`
              : 'クイック追加 — タスクをすばやく作成 (Enter で確定、自然言語で日時・優先度・タグ・見積時間を指定可)'
          }
          aria-describedby="quick-add-preview quick-add-hint"
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              void submit()
            }
          }}
          // iter350: タスク title は app 固有で browser autoComplete 候補は無関係。
          // 各回新規入力なので "off" でドロップダウンを抑制 (頻繁な入力 hot path で
          // suggested 候補のチラ見えは集中阻害)。
          autoComplete="off"
          enterKeyHint="send"
          className="h-11 flex-1"
        />
        <Button
          type="button"
          className="min-h-11"
          onClick={() => void submit()}
          disabled={create.isPending || !preview?.title || (preview?.isMust ?? false)}
          aria-busy={create.isPending || undefined}
          data-testid="quick-add-submit"
          aria-keyshortcuts="Enter"
          // iter1114: visible "作成" を aria-label 冒頭固定 (iter1093-1113 sweep convention)。
          // pending visible "…" は aria-label 末尾 "…" と substring 一致で維持。
          // iter1170: iter1114 sweep の !preview.title / isMust 2 path 漏れ — 旧
          // 'タスクを作成するには…' / 'MUST タスクは編集ダイアログから…' は visible "作成"
          // を中位置 ("タスクを **作成** するには…" / "DoD を入力して **作成** してください")
          // に持ち voice control prefix-matching「click 作成」 match 不可 (substring 一致のみ)。
          // 両 path とも '作成 — ...' 形式に揃え、4 path 全てで visible 冒頭固定 (pending を除く)。
          aria-label={
            !preview?.title
              ? '作成 — タスクを作成するにはタイトルを入力してください (Enter でも可)'
              : preview.isMust
                ? '作成 — MUST タスクは編集ダイアログから DoD を入力して作成してください'
                : create.isPending
                  ? `「${preview.title}」を作成中…`
                  : `作成 — 「${preview.title}」を作成 (Enter でも可)`
          }
        >
          {/* iter1090: visible は ASCII '...' (U+002E×3) で aria-label は U+2026 '…' を使い
              literal substring 不一致 = WCAG 2.5.3 違反 + voice control 不可。
              iter1078b-1083 sweep の同 pattern を quick-add にも展開、U+2026 に統一。
              (visible は "..." の 3 文字 → "…" の 1 文字へ、視覚上は 3 ドット表示で同等。) */}
          <span aria-hidden="true">{create.isPending ? '…' : '作成'}</span>
        </Button>
      </div>
      {preview && preview.title && (
        <div
          id="quick-add-preview"
          className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          /* iter1601: 旧 aria-label `"解析結果: X"` の colon は iter1093-1600 sweep の em-dash 区切と
             divergent。live region announce text の `:` を ` — ` em-dash に統一。 */
          aria-label={`解析結果 — ${previewSummary}`}
        >
          <span className="truncate font-mono" aria-hidden="true">
            → {preview.title}
          </span>
          {preview.scheduledFor && (
            // iter439: 旧 <span title> (mouse hover only) は SR / keyboard で
            // ISO 日付不可達。<time dateTime> 要素に格上げ (HTML5 semantic、
            // iter435 / iter436 / iter437 と同 pattern 5 view 目)。
            <time
              className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
              dateTime={preview.scheduledFor}
            >
              <span aria-hidden="true">
                {formatFriendlyDate(preview.scheduledFor, new Date())}
                {preview.dueTime ? ` ${preview.dueTime}` : ''}
              </span>
              <span className="sr-only">{`予定 ${preview.scheduledFor}${preview.dueTime ? ` ${preview.dueTime}` : ''}`}</span>
            </time>
          )}
          {preview.priority && (
            <span
              className={`rounded px-1.5 py-0.5 ${PRIO_COLOR[preview.priority]}`}
              aria-hidden="true"
            >
              p{preview.priority}
            </span>
          )}
          {preview.tags.map((t) => (
            <span
              key={t}
              className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
              aria-hidden="true"
            >
              #{t}
            </span>
          ))}
          {preview.assignees.map((a) => (
            <span
              key={a}
              className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              aria-hidden="true"
            >
              @{a}
            </span>
          ))}
          {preview.estimateMinutes && (
            // iter1062: 隣の calibrated chip (iter441) が既 `role="img"` だったので
            // consistency を揃え、見積 chip にも `role="img"` 付与 (role=img sweep 15 弾目、
            // iter1023/1049-1061 同 pattern)。
            <span
              className="rounded bg-cyan-100 px-1.5 py-0.5 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300"
              data-testid="quick-add-estimate"
              role="img"
              /* iter1605: 旧 aria-label `"見積 ${estimate}"` は visible "🕐 ${estimate}" の text 部 を
                 末尾に持ち voice control prefix-matching「click 30分」 が strict prefix-match で不可
                 (substring 一致のみ)。iter1553-1604 visible 冒頭 em-dash sweep に合わせ visible
                 (icon 抜きの text 部) 冒頭固定 + em-dash 区切。 */
              aria-label={`${formatEstimate(preview.estimateMinutes)} — 見積`}
            >
              <span aria-hidden="true">🕐 {formatEstimate(preview.estimateMinutes)}</span>
            </span>
          )}
          {/* iter267: bias calibration が利用可能なら校正値を annotation で表示。
              delta=0 の場合は表示しない (情報量ゼロ)。Item.description には
              元の見積をそのまま記録するので、UI 提示のみで実データには影響しない。
              iter441: title= (mouse only) を削除、aria-label に factor 詳細を集約
              (iter440 ActiveTimerPanel と同 pattern)。 */}
          {calibrated && calibrated.deltaMinutes !== 0 && (
            <span
              className="rounded border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 text-[10px] text-cyan-600 dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-300"
              data-testid="quick-add-estimate-calibrated"
              role="img"
              aria-label={`校正後 ${formatEstimate(calibrated.calibratedMinutes)} — ${calibrated.deltaMinutes > 0 ? '+' : ''}${calibrated.deltaMinutes}分、中央値 ${calibrationFactor?.toFixed(2)}× 補正`}
            >
              <span aria-hidden="true">→ {formatEstimate(calibrated.calibratedMinutes)}</span>
            </span>
          )}
          {preview.isMust && (
            <>
              <MustBadge />
              <span
                // iter1533: MUST DoD warn chip も light 固定だった、iter1376/1493/1512-1532 と同 dark variant 補完。
                className="rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-[10px] text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                role="alert"
                data-testid="quick-add-must-warn"
              >
                <span aria-hidden="true">⚠ </span>編集ダイアログで DoD を入れてください
              </span>
            </>
          )}
          {preview.decomposeHint && (
            <span
              className="rounded bg-violet-100 px-1.5 py-0.5 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
              aria-hidden="true"
            >
              🧠 AI 分解
            </span>
          )}
        </div>
      )}
      <p id="quick-add-hint" className="text-muted-foreground text-[11px]">
        キーワード:
        明日/今日/明後日/今日中/今週中/来週X曜/今週末/来週末/月初/月末/来月/来月初/来月末/today/tomorrow/tmrw/monday..sunday/next
        monday/this weekend/next weekend/start of (next) month (som/sonm)/end of (next) month
        (eom/eonm)/eod・end of day/eow・end of week/Apr 30 (英語月名)/30 Apr/Apr 30, 2027/Apr 30th
        (序数)/3/15 or 3-15 (M/D・M-D)/+Nd or in N days (N 日後)/+Nw or in N weeks (N
        週間後)/HH:MM/9am・2pm
        (AM/PM)/朝・昼・夕方・夜/morning・noon・afternoon・evening・night・midnight/p1-p4/#tag/@user/MUST/見積
        (30分・1時間・1時間30分・30m・1.5h・2h30m)。 末尾 <code>?</code> で AI 分解候補化。
      </p>
    </div>
  )
}
