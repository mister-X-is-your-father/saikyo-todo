/**
 * Phase 6.15 — MUST item の graphical badge (⚠ icon + 短縮 / 通常 ラベル)。
 *
 * graphical 波及シリーズの 1 つ。今まで 6 箇所 (today / inbox / personal-period /
 * subtasks-panel / backlog / archived) で似た inline `<span class="bg-red-100">MUST</span>`
 * を書いていたのを、`StatusBadge` と同パターンで統一する。
 *
 * 設計判断:
 *   - icon は Lucide `AlertTriangle` (静的、点滅などはしない — FEEDBACK_QUEUE で
 *     「期限近接で点滅などはやり過ぎ」と明示)
 *   - 配色は red (既存 6 箇所と同じ、ブランド色の MUST=赤に統一)
 *   - `iconOnly` mode で archive 等の狭い cell に対応 (旧 archived-items-panel が ⚠ のみ
 *     表示してたのを互換維持)
 *   - aria-label に "MUST タスク" 固定文言、icon は aria-hidden で重複防止
 *   - 旧 `aria-label="MUST item"` (英) と `"MUST タスク"` (和) が混在してたので
 *     和に統一 (UI 全体が日本語ベース)
 */
import { AlertTriangle } from 'lucide-react'

interface Props {
  /** 追加 className (chip 自体に乗る) */
  className?: string
  /** true: icon のみ (ラベルを sr-only)。Backlog / Archived 等の狭い cell 用 */
  iconOnly?: boolean
  /** Playwright / 単体テスト用 hook */
  'data-testid'?: string
}

/**
 * MUST item を ⚠ icon + 配色 + ラベルの graphical chip で描画する。
 * Item.isMust が true の時のみ render する想定 (caller 側で条件分岐)。
 */
export function MustBadge({ className, iconOnly = false, 'data-testid': dataTestid }: Props) {
  return (
    <span
      // iter1528: MUST badge は light 固定 (bg-red-100 + text-red-700 + ring-red-200)
      // で iter1376/1493/1512-1527 chip dark sweep からこぼれていた。MUST は重要 marker で
      // dark mode でも目立つべき。dark token: bg-red-950/40 + text-red-300 + ring-red-900/50
      // (iter1376/1493 同 pattern + ring 込み)。className override は最後で adopted。
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-red-200 ring-inset dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/50 ${className ?? ''}`}
      role="img"
      aria-label="MUST タスク"
      // iter1843: iter1841 StatusBadge と同 pattern を MustBadge にも展開、共通 component 1 修正で
      // 全 caller (Today / Inbox / Backlog / Dashboard / Period / Subtasks 等) の sighted hover で
      // "MUST タスク" disclose、iconOnly path も含めて統一。
      title="MUST タスク"
      data-testid={dataTestid}
    >
      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
      {iconOnly ? <span className="sr-only">MUST</span> : <span aria-hidden="true">MUST</span>}
    </span>
  )
}
