/**
 * 通知 (notifications row) の表示フォーマット純粋関数群。
 * Phase 6.15 iter 86 — UI component から抽出して単体テスト可能に。
 *
 * - formatNotificationBody(n): 通知の本文 (1 行) を生成
 * - formatRelativeTime(dateInput, now?): "たった今" / "5 分前" / "2 時間前" / 日付
 */
import type { Notification } from './schema'
import type { HeartbeatPayload, InvitePayload, MentionPayload, SyncFailurePayload } from './schema'

export function formatNotificationBody(n: Notification): string {
  if (n.type === 'heartbeat') {
    const p = n.payload as HeartbeatPayload
    const stageLabel: Record<HeartbeatPayload['stage'], string> = {
      '7d': '7 日後',
      '3d': '3 日後',
      '1d': '1 日後',
      overdue: '期限切れ',
    }
    const label = stageLabel[p.stage] ?? p.stage
    if (p.stage === 'overdue') {
      return `MUST Item の期限を ${Math.abs(p.daysUntilDue)} 日超過しています (${p.dueDate})`
    }
    return `MUST Item の期限が ${label} に迫っています (${p.dueDate})`
  }
  if (n.type === 'mention') {
    const p = n.payload as MentionPayload
    const preview = (p.preview ?? '').slice(0, 40)
    const ellipsis = (p.preview ?? '').length > 40 ? '…' : ''
    return `${p.mentionedBy} があなたに言及しました: "${preview}${ellipsis}"`
  }
  if (n.type === 'invite') {
    const p = n.payload as InvitePayload
    return `Workspace「${p.workspaceName}」に招待されました (${p.role})`
  }
  if (n.type === 'sync-failure') {
    const p = n.payload as SyncFailurePayload
    return `${p.source} の同期に失敗: ${p.reason}`
  }
  return `${n.type}: ${JSON.stringify(n.payload)}`
}

/** "たった今" / "5 分前" / "2 時間前" / "3 日前" / 30 日以上は ja-JP 日付。 */
export function formatRelativeTime(dateInput: Date | string, now: Date = new Date()): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const diffMs = now.getTime() - date.getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return 'たった今'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} 分前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 時間前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} 日前`
  return date.toLocaleDateString('ja-JP')
}
