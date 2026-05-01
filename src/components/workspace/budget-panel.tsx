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
  const ratioPct = s.limit !== null ? Math.min(100, Math.round(s.ratio * 100)) : 0

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base" role="heading" aria-level={2}>
          AI 月次コスト
          {s.exceeded && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
              上限到達
            </span>
          )}
          {!s.exceeded && s.warnTriggered && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
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
              aria-label={`AI 月次コスト消費率 ${ratioPct}% (警告閾値 ${Math.round(s.warnThreshold * 100)}%)`}
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
                style={{ left: `${Math.round(s.warnThreshold * 100)}%` }}
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {!editing ? (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              警告: {Math.round(s.warnThreshold * 100)}% で警告 (UI バー)
            </span>
            <Button
              size="sm"
              className="min-h-11"
              variant="ghost"
              onClick={startEdit}
              data-testid="budget-edit-btn"
              aria-label="AI 月次コスト上限と警告閾値の編集モードを開く"
            >
              上限を変更
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
                data-testid="budget-limit-input"
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
                data-testid="budget-warn-input"
              />
            </div>
            <div className="flex justify-end gap-1.5">
              <Button
                type="button"
                size="sm"
                className="min-h-11"
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={update.isPending}
              >
                キャンセル
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
                    ? 'AI 月次コスト上限を保存中…'
                    : 'AI 月次コスト上限と警告閾値を保存'
                }
              >
                {update.isPending ? '保存中…' : '保存'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
