'use client'

/**
 * AI コスト月次上限の表示 + 設定 UI (Phase 6.9)。
 *
 * - 当月の累積コスト / 上限のバー表示 (warn 閾値超過で黄、超過で赤)
 * - "上限を変更" ボタンで小さなインライン編集 (USD 数値 or 無制限)
 * - 上限超過時はバナーで Agent 起動が止まることを明示
 *
 * Dashboard view に置く想定。
 */
import { useMemo, useState } from 'react'

import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import { todayUtcISO } from '@/lib/date/iso'
import { isAppError } from '@/lib/errors'
import { rateToPct } from '@/lib/format-rate'
import { trendGlyph, trendToneClass } from '@/lib/ui/trend-tone'

import {
  useBudgetStatus,
  useMonthlyCost,
  useUpdateMonthlyCostLimit,
} from '@/features/agent/cost-hooks'
import {
  computeMonthlyCostTrend,
  formatMonthlyCostTrendJa,
  rollupCostByMonth,
} from '@/features/agent/cost-monthly-trend'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  workspaceId: string
}

// iter335 refactor: COST_TREND_TONE は lib/ui/trend-tone.ts に集約 (polarity='negative'、
// up=amber 警戒 / down=emerald 安心)。Dashboard velocity (positive) と差別化する
// ドメイン意味は polarity 引数で表現。

export function BudgetPanel({ workspaceId }: Props) {
  const status = useBudgetStatus(workspaceId)
  const monthly = useMonthlyCost(workspaceId, 3)
  const update = useUpdateMonthlyCostLimit()
  const [editing, setEditing] = useState(false)
  const [draftLimit, setDraftLimit] = useState('')
  const [draftWarn, setDraftWarn] = useState('')

  // iter333 basics: cost-monthly-trend (iter332) を bind — 先月比トレンド chip
  const trendChip = useMemo(() => {
    if (!monthly.data) return null
    const todayIso = todayUtcISO()
    const rolled = rollupCostByMonth(monthly.data)
    const trend = computeMonthlyCostTrend(rolled, todayIso)
    if (trend.direction === 'idle') return null
    return { trend, line: formatMonthlyCostTrendJa(trend) }
  }, [monthly.data])

  if (status.isLoading || !status.data) return null
  const s = status.data
  const limitLabel = s.limit === null ? '無制限' : `$${s.limit.toFixed(2)}`
  const ratioPct = s.limit !== null ? Math.min(100, rateToPct(s.ratio)) : 0

  function startEdit() {
    setDraftLimit(s.limit !== null ? String(s.limit) : '')
    setDraftWarn(String(s.warnThreshold))
    setEditing(true)
  }

  async function saveEdit() {
    const trimmed = draftLimit.trim()
    const limit = trimmed === '' ? null : Number(trimmed)
    if (limit !== null && (Number.isNaN(limit) || limit < 0)) {
      toast.error('上限は 0 以上の数値か、空欄 (無制限) にしてください')
      return
    }
    const warn = Number(draftWarn)
    if (Number.isNaN(warn) || warn < 0 || warn > 1) {
      toast.error('警告閾値は 0..1 の範囲で')
      return
    }
    try {
      await update.mutateAsync({
        workspaceId,
        monthlyCostLimitUsd: limit,
        costWarnThresholdRatio: warn,
      })
      toast.success('AI コスト上限を更新しました')
      setEditing(false)
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '更新に失敗')
    }
  }

  return (
    <Card role="region" aria-labelledby="budget-panel-heading">
      <CardHeader>
        <CardTitle
          id="budget-panel-heading"
          className="flex items-center gap-2 text-base"
          role="heading"
          aria-level={2}
        >
          AI 月次コスト
          {s.exceeded && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
              上限到達
            </span>
          )}
          {!s.exceeded && s.warnTriggered && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              {/* iter1522: budget warn chip light 固定だった、iter1376/1493/1512-1521 と同 dark variant 補完。 */}
              警告
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {s.exceeded && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-700 dark:text-red-300"
            data-testid="budget-exceeded-alert"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              月次上限 ({limitLabel}) に達しました。Agent (Researcher / PM)
              の新規起動は来月までブロックされます。
            </div>
          </div>
        )}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">当月実績 / 上限</span>
            <span className="font-mono">
              ${s.spent.toFixed(2)} / {limitLabel}
              {s.limit !== null && (
                <span className="text-muted-foreground ml-1">({ratioPct}%)</span>
              )}
            </span>
          </div>
          {trendChip ? (
            <div
              className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] ${trendToneClass(trendChip.trend.direction, 'negative')}`}
              data-testid="budget-cost-trend-chip"
              data-direction={trendChip.trend.direction}
              role="status"
              aria-live="polite"
              aria-label={trendChip.line}
              title={trendChip.line}
            >
              <span aria-hidden="true" className="font-mono">
                {trendGlyph(trendChip.trend.direction)}
              </span>
              <span aria-hidden="true">{trendChip.line}</span>
            </div>
          ) : null}
          {s.limit !== null && (
            <div
              role="progressbar"
              aria-label={`AI 月次コスト消費率 ${ratioPct}% — 警告閾値 ${rateToPct(s.warnThreshold)}%`}
              aria-valuenow={ratioPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={`${ratioPct}% — ${s.exceeded ? '上限到達' : s.warnTriggered ? '警告' : '正常'}`}
              data-testid="budget-progress"
              data-budget-state={s.exceeded ? 'exceeded' : s.warnTriggered ? 'warn' : 'normal'}
              className="bg-muted relative h-2 w-full overflow-hidden rounded-full"
            >
              <div
                className={`h-full ${
                  s.exceeded ? 'bg-red-500' : s.warnTriggered ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${ratioPct}%` }}
                aria-hidden="true"
              />
              {/* 警告閾値ライン (視覚補助、SR には親 aria-label に含めて伝達) */}
              <div
                className="bg-foreground/40 absolute top-0 h-full w-px"
                style={{ left: `${rateToPct(s.warnThreshold)}%` }}
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {!editing ? (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              警告: {rateToPct(s.warnThreshold)}% で警告 (UI バー)
            </span>
            <Button
              size="sm"
              className="min-h-11"
              variant="ghost"
              onClick={startEdit}
              data-testid="budget-edit-btn"
              // iter1077: visible "上限を変更" は aria-label "AI 月次コスト上限と
              // 警告閾値の編集モードを開く" で "編集モードを開く" 等で literal
              // substring 不一致 → WCAG 2.5.3 (Label in Name) 違反。visible-prefix
              // を先頭固定 (iter1068/1071-1075 sweep)。
              aria-label="上限を変更 — AI 月次コスト上限と警告閾値の編集モードを開く"
            >
              <span aria-hidden="true">上限を変更</span>
            </Button>
          </div>
        ) : (
          // iter312: 旧 <div> ラッパで Enter キー submit 不可、aria-busy も無し。
          // iter303-308 の noValidate sweep と同じく <form> 化 + zod 単一経路を踏襲。
          <form
            className="space-y-2 rounded border border-dashed p-2"
            noValidate
            aria-busy={update.isPending || undefined}
            aria-label="AI 月次コスト上限編集フォーム"
            data-testid="budget-edit-form"
            onSubmit={(e) => {
              e.preventDefault()
              void saveEdit()
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="budget-limit" className="text-xs">
                月次上限 (USD、空欄で無制限)
              </Label>
              <Input
                id="budget-limit"
                type="number"
                step="0.01"
                min={0}
                value={draftLimit}
                onChange={(e) => setDraftLimit(e.target.value)}
                placeholder="例: 50.00"
                // iter349: USD 通貨額は decimal 入力 (.50) 必須、mobile に小数 keypad を呼出。
                inputMode="decimal"
                enterKeyHint="next"
                data-testid="budget-limit-input"
                aria-label={
                  draftLimit === ''
                    ? '月次上限 (USD) — 空欄で無制限'
                    : Number.isNaN(Number(draftLimit)) || Number(draftLimit) < 0
                      ? `月次上限 (USD、0 以上の数値必須、現在値「${draftLimit}」は不正)`
                      : `月次上限 (USD、現在: $${Number(draftLimit).toFixed(2)})`
                }
                aria-invalid={
                  (draftLimit !== '' &&
                    (Number.isNaN(Number(draftLimit)) || Number(draftLimit) < 0)) ||
                  undefined
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="budget-warn" className="text-xs">
                警告閾値 (0..1)
              </Label>
              <Input
                id="budget-warn"
                type="number"
                step="0.05"
                min={0}
                max={1}
                value={draftWarn}
                onChange={(e) => setDraftWarn(e.target.value)}
                inputMode="decimal"
                enterKeyHint="send"
                data-testid="budget-warn-input"
                aria-label={
                  draftWarn === '' || Number.isNaN(Number(draftWarn))
                    ? '警告閾値 (0..1、消費率がこの値を超えると UI バーを警告色に切替)'
                    : Number(draftWarn) < 0 || Number(draftWarn) > 1
                      ? `警告閾値 (有効範囲は 0-1、現在値「${draftWarn}」は範囲外)`
                      : `警告閾値 (現在: ${rateToPct(Number(draftWarn))}% — 消費率がこの値を超えると UI バーを警告色に切替)`
                }
                aria-invalid={
                  (draftWarn !== '' && (Number(draftWarn) < 0 || Number(draftWarn) > 1)) ||
                  undefined
                }
              />
            </div>
            <div
              className="flex justify-end gap-1.5"
              role="group"
              aria-label="AI 月次コスト上限編集の操作 (キャンセル / 保存)"
            >
              {/* iter1102: budget-edit-cancel / budget-save-btn の旧 aria-label は visible
                  "キャンセル" / "保存" / "保存中…" を末尾持ち、voice control prefix-matching
                  「click 保存/キャンセル」 match 不可。iter1093-1101 sweep convention で
                  visible 冒頭固定。 */}
              <Button
                type="button"
                size="sm"
                className="min-h-11"
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={update.isPending}
                data-testid="budget-edit-cancel"
                aria-label="キャンセル — AI 月次コスト上限の編集を破棄"
              >
                <span aria-hidden="true">キャンセル</span>
              </Button>
              <Button
                type="submit"
                size="sm"
                className="min-h-11"
                disabled={update.isPending}
                aria-busy={update.isPending || undefined}
                data-testid="budget-save-btn"
                aria-label={
                  update.isPending
                    ? '保存中… — AI 月次コスト上限を保存中'
                    : '保存 — AI 月次コスト上限と警告閾値を保存'
                }
              >
                <span aria-hidden="true">{update.isPending ? '保存中…' : '保存'}</span>
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
