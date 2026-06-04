'use client'

import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'
import { formatMinutesJa } from '@/lib/format-duration'

import { categoryLabel } from '@/features/time-entry/categories'
import { useSyncTimeEntry } from '@/features/time-entry/hooks'
import type { TimeEntry } from '@/features/time-entry/schema'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// iter921: aria-label "外部同期: ${jaLabel}" を持つ 3 Badge いずれも visible
// "synced" / "failed" / "pending" が aria-hidden 無し → 内側 visible を
// aria-hidden span で wrap、aria-label 単独 SR 経路に集約 (iter918-920 続編)。
// iter1075: 上記で aria-hidden 化したが visible "synced"/"failed"/"pending"
// (English) が aria-label の "完了"/"失敗"/"未実行" (Japanese) と
// literal substring 不一致 → WCAG 2.5.3 (Label in Name) 違反。voice control
// "click synced" matching 不可。visible English を aria-label の prefix に
// 固定 (iter1068/1071-1074 sweep)。さらに shadcn Badge は role 無 span
// で role=img 付与 (iter1051/1069/1070 と同 pattern、role=img sweep 23 弾目)。
function SyncBadge({ status }: { status: TimeEntry['syncStatus'] }) {
  if (status === 'synced') {
    return (
      <Badge
        variant="outline"
        // iter1524: time-entry sync badge 3 状態 (synced/failed/pending) は light 固定で
        // iter1376/1493/1512-1523 chip dark sweep からこぼれていた。dark variant 補完。
        className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
        role="img"
        /* iter1701: 旧 `synced — 外部同期: 完了` の colon は iter1629 sweep
           (StatusBadge `ステータス: ${X}` → `ステータス ${X}`) の取りこぼし。
           em-dash で visible/descriptor を分けた後の descriptor 部内は colon 無し
           の natural-reading convention に揃え、SR 読み上げ pattern を sibling
           Badge family と統一。 */
        aria-label="synced — 外部同期 完了"
        data-testid="sync-badge-synced"
      >
        <span aria-hidden="true">synced</span>
      </Badge>
    )
  }
  if (status === 'failed') {
    return (
      <Badge
        variant="outline"
        className="border-transparent bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
        role="img"
        /* iter1701: 同 file 同 sweep。 */
        aria-label="failed — 外部同期 失敗"
        data-testid="sync-badge-failed"
      >
        <span aria-hidden="true">failed</span>
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="border-transparent bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300"
      role="img"
      /* iter1701: 同 file 同 sweep。 */
      aria-label="pending — 外部同期 未実行"
      data-testid="sync-badge-pending"
    >
      <span aria-hidden="true">pending</span>
    </Badge>
  )
}

export function TimeEntriesTable({
  workspaceId,
  entries,
}: {
  workspaceId: string
  entries: TimeEntry[]
}) {
  const sync = useSyncTimeEntry(workspaceId)

  async function handleSync(id: string) {
    try {
      await sync.mutateAsync(id)
      toast.success('Sync キューに投入しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'Sync 失敗')
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid="time-entries-table">
        <caption className="sr-only">
          {/* iter1617: 旧 sr-only caption paren convention `(日付 / カテゴリ / 作業内容 / 時間 / 外部同期ステータス)` は
              iter1093-1616 sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。 */}
          稼働時間記録一覧 — 日付 / カテゴリ / 作業内容 / 時間 / 外部同期ステータス
        </caption>
        <thead>
          <tr className="border-b text-left">
            <th scope="col" className="py-2">
              日付
            </th>
            <th scope="col" className="py-2">
              カテゴリ
            </th>
            <th scope="col" className="py-2">
              作業内容
            </th>
            <th scope="col" className="py-2 text-right">
              時間
            </th>
            <th scope="col" className="py-2">
              Sync
            </th>
            <th scope="col" className="py-2">
              <span className="sr-only">操作</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b align-top" data-testid={`time-entry-row-${e.id}`}>
              <td className="py-2">
                {/* iter445: 旧 raw ISO span → <time dateTime> 要素で HTML5 date
                    semantic 化 (iter435 / iter436 / iter437 / iter439 と同 pattern
                    6 view 目水平展開、SR が日付 token として認識)。 */}
                <time dateTime={e.workDate}>{e.workDate}</time>
              </td>
              <td className="py-2">{categoryLabel(e.category)}</td>
              {/* iter1733: iter1720 mock-entries 同 pattern。truncate で 320px 超は visual ellipsis
                  だが title 属性無で sighted は hover で全文を見れない。`title={e.description || ''}` で
                  description が non-empty なら hover tooltip、empty (= visible "—") なら tooltip 非表示。
                  SR は no-op (既に full text 読む)。 */}
              <td className="max-w-[320px] truncate py-2" title={e.description || ''}>
                {e.description || '—'}
              </td>
              <td className="py-2 text-right">{formatMinutesJa(e.durationMinutes)}</td>
              <td className="py-2">
                <SyncBadge status={e.syncStatus} />
                {e.syncError && (
                  // iter1079 basics: role="img" 付与で SR aria-label authoritative 化
                  // 26 弾目 (iter1023/1049-1078 sweep 続編)。sync-error の inline 表示
                  // は role 無 div + aria-label のみで SR picked-up divergence。
                  <div
                    className="text-muted-foreground mt-1 max-w-[220px] truncate text-[10px]"
                    title={e.syncError}
                    role="img"
                    /* iter1566: 旧 aria-label `"同期エラー: ${e.syncError}"` は visible
                       "${e.syncError}" を末尾に持ち voice control prefix-matching が strict
                       prefix-match で不可 (substring 一致のみ)。iter1553-1565 status/role/health/
                       傾向/summary chip family と同 pattern、visible 冒頭固定 + em-dash 区切。 */
                    aria-label={`${e.syncError} — 同期エラー`}
                    data-testid={`sync-error-${e.id}`}
                  >
                    <span aria-hidden="true">{e.syncError}</span>
                  </div>
                )}
              </td>
              <td className="py-2 text-right">
                {e.syncStatus !== 'synced' && (
                  <Button
                    size="sm"
                    className="min-h-11"
                    variant="outline"
                    disabled={sync.isPending}
                    aria-busy={sync.isPending || undefined}
                    onClick={() => handleSync(e.id)}
                    data-testid={`time-entry-sync-${e.id}`}
                    // iter1214: 旧 aria-label は visible "Sync" / "再Sync" / "Sync 中…" を中位置
                    // ("「desc」(date) を **Sync 中…**" / "...を **{再?}Sync**") に持ち voice
                    // control prefix-matching「click Sync / 再Sync / Sync 中…」 match 不可
                    // (substring 一致のみ)。subtasks-indent iter1213 と同 sweep を time-entry-sync
                    // にも展開。visible "Sync" 等を冒頭固定 + em-dash 区切で descriptive
                    // ("「desc」(date) を Sync") 末尾保持。
                    aria-label={
                      sync.isPending
                        ? `Sync 中… — 「${e.description || '(無題)'}」(${e.workDate}) を Sync 中`
                        : e.syncStatus === 'failed'
                          ? `再Sync — 「${e.description || '(無題)'}」(${e.workDate}) を再 Sync`
                          : `Sync — 「${e.description || '(無題)'}」(${e.workDate}) を Sync`
                    }
                  >
                    <span aria-hidden="true">{e.syncStatus === 'failed' ? '再Sync' : 'Sync'}</span>
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
