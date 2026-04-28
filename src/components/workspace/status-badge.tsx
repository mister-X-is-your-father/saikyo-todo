import { Badge } from '@/components/ui/badge'

/**
 * workspace_statuses.key → 日本語ラベル + バッジ色の既定マッピング。
 * 既定 3 種 (todo / in_progress / done) をカバー、未知の key はそのまま表示。
 */
const STATUS_PRESETS: Record<string, { label: string; className: string }> = {
  todo: {
    label: 'TODO',
    className: 'bg-slate-100 text-slate-700',
  },
  in_progress: {
    label: '進行中',
    className: 'bg-blue-100 text-blue-700',
  },
  done: {
    label: '完了',
    className: 'bg-emerald-100 text-emerald-700',
  },
}

export function statusLabel(key: string): string {
  return STATUS_PRESETS[key]?.label ?? key
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const p = STATUS_PRESETS[status] ?? { label: status, className: 'bg-muted' }
  return (
    <Badge
      variant="outline"
      className={`${p.className} border-transparent ${className ?? ''}`}
      aria-label={`ステータス: ${p.label}`}
    >
      {p.label}
    </Badge>
  )
}
