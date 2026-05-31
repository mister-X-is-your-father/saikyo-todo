/**
 * Phase 6.15 iter — Item.status の graphical badge (icon + 配色 + 短縮ラベル)。
 *
 * iter255 系で `subtask-status.ts` で確立した「番号 + 色 + Lucide icon」 pattern を
 * Today / Inbox / Backlog / Personal-period / Dashboard に波及させる共通 component。
 * 設定 (label / 配色 / icon variant) は `@/features/item/status-visual.ts` で集約。
 *
 * 利用想定:
 *   - row 中の inline badge (各 view の Item 行 / Backlog cell / Dashboard MUST)
 *   - aria-label にフル文言、可視ラベルは短縮形 ("TODO" / "進行中" / "完了" 等)
 *   - icon は aria-hidden で重複読み上げを防ぐ
 *
 * 旧仕様 (text のみ) との互換: callers は `status` prop だけで利用済なので
 * 自動 upgrade される。`statusLabel(key)` 関数 export も維持 (将来削除可)。
 */
import { Ban, CheckCircle2, Circle, HelpCircle, PlayCircle, XCircle } from 'lucide-react'

import {
  getStatusVisual,
  type StatusIconKey,
  type StatusVisualConfig,
} from '@/features/item/status-visual'

import { Badge } from '@/components/ui/badge'

const STATUS_ICONS: Record<StatusIconKey, typeof Circle> = {
  circle: Circle,
  progress: PlayCircle,
  done: CheckCircle2,
  cancel: XCircle,
  block: Ban,
  unknown: HelpCircle,
}

/** 旧 API 互換 — Item.status から日本語ラベル文字列 (短縮形) を取り出す */
export function statusLabel(key: string): string {
  return getStatusVisual(key).shortLabel
}

interface Props {
  status: string
  /** 追加 className (chip 自体に乗る) */
  className?: string
  /** true: icon のみ (label を sr-only)。Backlog 等の狭い cell 用 */
  iconOnly?: boolean
  /** Playwright / 単体テスト用 hook (Badge の root に乗る) */
  'data-testid'?: string
}

/**
 * Item.status を icon + 配色 + 短縮ラベルの graphical chip で描画する。
 *
 * - role=img + aria-label でフル文言 (例: "ステータス: TODO (未着手)") を SR に
 * - icon は aria-hidden で重複防止、shortLabel は visible
 * - 不明な status key は HelpCircle + "不明" で fallback (落ちない)
 */
export function StatusBadge({
  status,
  className,
  iconOnly = false,
  'data-testid': dataTestid,
}: Props) {
  const cfg: StatusVisualConfig = getStatusVisual(status)
  const Icon = STATUS_ICONS[cfg.iconKey]
  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1 border-transparent ring-1 ring-inset ${cfg.bgClass} ${cfg.textClass} ${cfg.ringClass} ${className ?? ''}`}
      role="img"
      /* iter1555: 旧 aria-label `"ステータス: ${cfg.label}"` は visible "${cfg.shortLabel}" (e.g.,
         "完了" / "TODO" / "blocked") を末尾の cfg.label にしか含まず voice control prefix-matching
        「click 完了」 が strict prefix-match で不可 (substring 一致のみ)。iter1553/1554 sprint/goal
         status Badge と同 pattern、visible 冒頭固定 + em-dash 区切。 */
      aria-label={`${cfg.shortLabel} — ステータス: ${cfg.label}`}
      data-testid={dataTestid}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {iconOnly ? (
        <span className="sr-only">{cfg.shortLabel}</span>
      ) : (
        <span aria-hidden="true">{cfg.shortLabel}</span>
      )}
    </Badge>
  )
}
