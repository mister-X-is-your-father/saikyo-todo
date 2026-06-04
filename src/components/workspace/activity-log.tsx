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
            className="bg-muted/40 text-foreground/80 inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px]"
            role="status"
            aria-live="polite"
            aria-label={summary}
            data-testid="activity-log-summary"
            title={summary}
          >
            <ActivityIcon className="h-3 w-3" aria-hidden="true" />
            <span aria-hidden="true">{summary}</span>
          </div>
          {/* iter1063: role 無 span + aria-label を `role="img"` で
              authoritative 化 (iter1023/1049-1062 同 pattern、role=img sweep
              16 弾目)。Activity log の hint + top-actor chip 2 件をまとめて
              統一 (activity-log 内 実行者 chip は iter1049 で既 role=img、
              これで activity-log 全 chip 揃った)。 */}
          {hint && (
            <span
              className={`rounded border px-2 py-0.5 text-[11px] font-medium ${hint.chipClass}`}
              data-testid="activity-log-hint"
              data-severity={hint.severity}
              role="img"
              /* iter1557: 旧 `Activity 状態: ${hint.label}` は ':' colon 区切で visible
                 ${hint.label} を末尾に持ち voice control prefix-matching「click ${label}」
                 が strict prefix-match で不可。iter1093-1556 sweep convention で
                 visible 冒頭固定 + em-dash 区切。 */
              aria-label={`${hint.label} — Activity 状態`}
              /* iter1901: visible は label のみで「Activity 状態」 context が無い、
                 sighted hover で disclose (iter1853 sprint-status / iter1899 import-status と同
                 status chip family pattern)。 */
              title={`${hint.label} — Activity 状態`}
            >
              <span aria-hidden="true">{hint.label}</span>
            </span>
          )}
          {topActor && (
            <span
              // iter1514: light 固定 chip を iter1376/1493/1512/1513 pattern で dark variant 補完。
              className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
              data-testid="activity-log-top-actor"
              role="img"
              aria-label={formatTopActorJa(topActor)}
              title={formatTopActorJa(topActor)}
            >
              <span aria-hidden="true">⭐ {formatTopActorJa(topActor)}</span>
            </span>
          )}
        </div>
      ) : null}
      <ul
        className="space-y-2"
        data-testid="activity-log"
        aria-label={`Activity 履歴 — ${data.length} 件`}
        /* iter2291: Activity 履歴 ul の aria-label "Activity 履歴 — N 件" は browser tooltip
           にならず sighted は hover で「Activity 履歴 + N 件」 disclose 不可。MCP path A で
           ItemEditDialog アクティビティタブ探索中に発見、一覧 ul family 5 entity (sources /
           workflows / goals / templates / workspaces) iter2267 と同 pattern を Activity log
           ul にも展開、6 entity 一覧 ul family 完成。 */
        title={`Activity 履歴 — ${data.length} 件`}
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
            /* iter1558: 旧 `操作種別: ${label}` は ':' colon 区切で visible "${label}"
               (= 隣接 aria-hidden span の text) を末尾に持ち voice control prefix-matching
               「click ${label}」 が strict prefix-match で不可。iter1093-1557 sweep convention
               で visible 冒頭固定 + em-dash 区切。 */
            aria-label={`${label} — 操作種別`}
            data-testid={`activity-action-icon-${entry.action}`}
            /* iter1903: icon-only chip は visible に label 文字無 (隣 span が visible)、
               icon 上 hover で「{label} — 操作種別」 disclose
               (iter1901 hint chip / iter1853 sprint-status と同 status chip family pattern)。 */
            title={`${label} — 操作種別`}
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
          </span>
          <span className="font-medium" aria-hidden="true">
            {label}
          </span>
          {/* iter1049: 旧 outer span は role 無で aria-label の SR picked-up が不確実
              (browser / SR で divergence)。`role="img"` で aria-label を
              authoritative 化 (iter1023 TaskChute time slot と同 pattern)。 */}
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              entry.actorType === 'agent'
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-foreground'
            }`}
            role="img"
            /* iter1561: 旧 `実行者: {AI Agent|ユーザ}` は ':' colon 区切で visible
               ("AI"/"user") を先頭に持たず voice control prefix-matching 不可。
               agent path は visible "AI" → aria "AI Agent — 実行者" で prefix-match 復活。
               user path は旧 visible "user" (English) と旧 aria "ユーザ" (Japanese) の
               language divergence で voice control「click user」 / 「click ユーザ」 どちらでも
               不可 → visible を Ja "ユーザ" に揃え、aria を "ユーザ — 実行者" 形式に統一。 */
            aria-label={entry.actorType === 'agent' ? 'AI Agent — 実行者' : 'ユーザ — 実行者'}
            /* iter1905: agent path は visible "AI" 略記、user path は visible "ユーザ" のみで
               「実行者」 context が無い、sighted hover で disclose
               (iter1903 action icon / iter1901 hint chip と同 activity-log file 内 sweep)。 */
            title={entry.actorType === 'agent' ? 'AI Agent — 実行者' : 'ユーザ — 実行者'}
          >
            <span aria-hidden="true">{entry.actorType === 'agent' ? 'AI' : 'ユーザ'}</span>
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
          // iter1305 (modeM hazard 続き、comment-thread iter1303 / operation-board iter1304 と同 fix):
          // iter507 の pseudo `-inset-3` (12px) は visible h-5 (20px) 前提 (item-checkbox
          // iter505 convention) で text-[11px] (line-height ~14px) には 14+24=38px < 44 で
          // WCAG 2.5.5 未達。`min-h-11 inline-flex items-center` 追加で 44 tall 化、visible は
          // vertically center で見た目バランス維持。
          className="text-muted-foreground focus-visible:ring-ring relative mt-1 inline-flex min-h-11 items-center rounded text-[11px] underline before:absolute before:-inset-3 before:content-[''] focus-visible:ring-2 focus-visible:outline-none"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          /* iter1645: 旧 `aria-controls={detailId}` は静的だが、controlled `<pre id={detailId}>`
             は `{open && hasDetail}` 条件下のみ render される (collapsed 時は null)。dangling
             ARIA id-ref で iter1637 quick-add と同 pattern (WAI-ARIA spec 1.2 §9.4 違反)。
             open 時のみ aria-controls を設定し disclosure pattern 完全性を維持。 */
          aria-controls={open ? detailId : undefined}
          // iter1041: visible "詳細を見る" / "詳細を閉じる" を aria-label の prefix に
          // 固定し WCAG 2.5.3 satisfy (旧 aria-label は "差分 (before / after) を見る"
          // で "詳細を見る" literal substring 不一致だった)。
          aria-label={
            open
              ? `詳細を閉じる — 「${label}」の差分 (before / after) を閉じる`
              : `詳細を見る — 「${label}」の差分 (before / after) を見る`
          }
          /* iter2293: activity-detail-toggle の aria-label は state-dependent 2-path (open /
             closed、label context 含む) で SR には full context を渡すが browser tooltip に
             ならず sighted は hover で同 context disclose 不可。MCP path A で アクティビティ
             タブで発見、subtask-outdent/indent iter2113 と同 state-dependent toggle title
             pattern を activity-detail-toggle にも展開、template-card iter2239 と同 disclosure
             button title 完成。 */
          title={
            open
              ? `詳細を閉じる — 「${label}」の差分 (before / after) を閉じる`
              : `詳細を見る — 「${label}」の差分 (before / after) を見る`
          }
          data-testid={`activity-detail-toggle-${entry.id}`}
        >
          <span aria-hidden="true">{open ? '詳細を閉じる' : '詳細を見る'}</span>
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
