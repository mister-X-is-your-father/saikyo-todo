'use client'

/**
 * Item に関する Activity (audit_log) 一覧表示。
 * - admin 以上のみ閲覧可能 (サービス層で fallback 空配列)
 * - iter298 basics: 各 action 行頭に icon + 配色 chip (graphical 波及シリーズ)
 * - before/after は JSON 折りたたみ
 */
import { useMemo, useState } from 'react'

import {
  Activity as ActivityIcon,
  ArrowRightLeft,
  CheckCircle2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'

import { buildFourStateHintChip } from '@/lib/widget/severity-bridges'

import { type AuditActionIconKey, getAuditActionVisual } from '@/features/audit/action-visual'
import {
  classifyAuditActivityHint,
  formatAuditActivityBrief,
  formatAuditActivityHintJa,
  formatTopActorJa,
  groupAuditByActor,
  groupAuditByCategory,
  pickTopActor,
} from '@/features/audit/audit-activity'
import { useAuditByTargetItem } from '@/features/audit/hooks'

/** action-visual の iconKey から Lucide component に map (status-visual と同パターン)。 */
const ACTION_ICON: Record<AuditActionIconKey, typeof ActivityIcon> = {
  plus: Plus,
  pencil: Pencil,
  'arrow-right-left': ArrowRightLeft,
  'check-circle': CheckCircle2,
  'rotate-ccw': RotateCcw,
  trash: Trash2,
  activity: ActivityIcon,
}

export function ActivityLog({ itemId }: { itemId: string }) {
  const { data, isLoading, error } = useAuditByTargetItem(itemId)
  // iter326 basics: iter324 で整備済 audit-activity substrate (31/31 PASS) を bind。
  // Item に紐付く全 entry (user + agent 両方) を 1 行 brief で「活動 N 件 (M 名):
  // 作成 X / 更新 Y / ...」と要約。AI agent の自動操作も合算して見たいので
  // actorTypes=[] で全 actorType 集計。
  const summary = useMemo(() => {
    if (!data || data.length === 0) return null
    return formatAuditActivityBrief(data, { actorTypes: [] })
  }, [data])
  // iter498 basics: audit-activity hint chip (iter493 substrate + iter495 bridge)
  const hint = useMemo(() => {
    if (!data || data.length === 0) return null
    const counts = groupAuditByCategory(data, { actorTypes: [] })
    return buildFourStateHintChip(counts, classifyAuditActivityHint, formatAuditActivityHintJa)
  }, [data])
  // iter507 ai-automation: workspace の主軸 actor chip (iter506 substrate を UI 配線)
  const topActor = useMemo(() => {
    if (!data || data.length === 0) return null
    const byActor = groupAuditByActor(data, { actorTypes: [] })
    return pickTopActor(byActor)
  }, [data])
  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm" role="status" aria-live="polite">
        読み込み中…
      </p>
    )
  }
  if (error) {
    return (
      <p className="text-muted-foreground text-sm" role="alert">
        Activity の取得に失敗しました
      </p>
    )
  }
  if (!data || data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm" role="status" aria-live="polite">
        Activity は admin 以上のみ閲覧できます。まだ記録がないか、権限が不足しています。
      </p>
    )
  }
  return (
    <div className="space-y-2">
      {summary ? (
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="bg-muted/40 text-muted-foreground inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px]"
            role="status"
            aria-live="polite"
            aria-label={summary}
            data-testid="activity-log-summary"
            title={summary}
          >
            <ActivityIcon className="h-3 w-3" aria-hidden="true" />
            <span aria-hidden="true">{summary}</span>
          </div>
          {hint && (
            <span
              className={`rounded border px-2 py-0.5 text-[11px] font-medium ${hint.chipClass}`}
              data-testid="activity-log-hint"
              data-severity={hint.severity}
              aria-label={`Activity 状態: ${hint.label}`}
            >
              {hint.label}
            </span>
          )}
          {topActor && (
            <span
              className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700"
              data-testid="activity-log-top-actor"
              aria-label={formatTopActorJa(topActor)}
              title={formatTopActorJa(topActor)}
            >
              ⭐ {formatTopActorJa(topActor)}
            </span>
          )}
        </div>
      ) : null}
      <ul
        className="space-y-2"
        data-testid="activity-log"
        aria-label={`Activity 履歴 ${data.length} 件`}
      >
        {data.map((entry) => (
          <ActivityRow key={entry.id} entry={entry} />
        ))}
      </ul>
    </div>
  )
}

function ActivityRow({
  entry,
}: {
  entry: ReturnType<typeof useAuditByTargetItem>['data'] extends (infer U)[] | undefined ? U : never
}) {
  const [open, setOpen] = useState(false)
  const visual = getAuditActionVisual(entry.action)
  const Icon = ACTION_ICON[visual.iconKey]
  const label = visual.label === '操作' ? entry.action : visual.label
  const hasDetail = entry.before != null || entry.after != null
  const detailId = `activity-detail-${entry.id}`
  return (
    <li
      className="rounded border p-2 text-xs"
      data-testid={`activity-row-${entry.id}`}
      data-action={entry.action}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${visual.bgClass} ${visual.textClass} ${visual.ringClass}`}
            role="img"
            aria-label={`操作種別: ${label}`}
            data-testid={`activity-action-icon-${entry.action}`}
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
          </span>
          <span className="font-medium">{label}</span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              entry.actorType === 'agent'
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}
            aria-label={entry.actorType === 'agent' ? '実行者: AI Agent' : '実行者: ユーザ'}
          >
            {entry.actorType === 'agent' ? 'AI' : 'user'}
          </span>
        </div>
        <time
          className="text-muted-foreground tabular-nums"
          dateTime={new Date(entry.ts).toISOString()}
        >
          {new Date(entry.ts).toLocaleString('ja-JP')}
        </time>
      </div>
      {hasDetail && (
        <button
          type="button"
          // iter507: pseudo で tap target を 44x44 化 (visual text-[11px] underline 維持)
          className="text-muted-foreground focus-visible:ring-ring relative mt-1 rounded text-[11px] underline before:absolute before:-inset-3 before:content-[''] focus-visible:ring-2 focus-visible:outline-none"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={detailId}
          aria-label={
            open
              ? `「${label}」の差分 (before / after) を閉じる`
              : `「${label}」の差分 (before / after) を見る`
          }
          data-testid={`activity-detail-toggle-${entry.id}`}
        >
          {open ? '詳細を閉じる' : '詳細を見る'}
        </button>
      )}
      {open && hasDetail && (
        <pre id={detailId} className="bg-muted/40 mt-1 overflow-x-auto rounded p-2 text-[10px]">
          {JSON.stringify({ before: entry.before, after: entry.after }, null, 2)}
        </pre>
      )}
    </li>
  )
}
