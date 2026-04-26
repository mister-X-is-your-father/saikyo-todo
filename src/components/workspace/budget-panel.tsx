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
import { useState } from 'react'

import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useBudgetStatus, useUpdateMonthlyCostLimit } from '@/features/agent/cost-hooks'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  workspaceId: string
}

export function BudgetPanel({ workspaceId }: Props) {
  const status = useBudgetStatus(workspaceId)
  const update = useUpdateMonthlyCostLimit()
  const [editing, setEditing] = useState(false)
  const [draftLimit, setDraftLimit] = useState('')
  const [draftWarn, setDraftWarn] = useState('')

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
        <CardTitle className="flex items-center gap-2 text-base">
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
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
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
          {s.limit !== null && (
            <div className="bg-muted relative h-2 w-full overflow-hidden rounded-full">
              <div
                className={`h-full ${
                  s.exceeded ? 'bg-red-500' : s.warnTriggered ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${ratioPct}%` }}
              />
              {/* 警告閾値ライン */}
              <div
                className="bg-foreground/40 absolute top-0 h-full w-px"
                style={{ left: `${Math.round(s.warnThreshold * 100)}%` }}
                aria-label={`警告閾値 ${Math.round(s.warnThreshold * 100)}%`}
              />
            </div>
          )}
        </div>

        {!editing ? (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              警告: {Math.round(s.warnThreshold * 100)}% で警告 (UI バー)
            </span>
            <Button size="sm" variant="ghost" onClick={startEdit} data-testid="budget-edit-btn">
              上限を変更
            </Button>
          </div>
        ) : (
          <div className="space-y-2 rounded border border-dashed p-2">
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
                data-testid="budget-warn-input"
              />
            </div>
            <div className="flex justify-end gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={update.isPending}
              >
                キャンセル
              </Button>
              <Button
                size="sm"
                onClick={() => void saveEdit()}
                disabled={update.isPending}
                data-testid="budget-save-btn"
              >
                {update.isPending ? '保存中…' : '保存'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
