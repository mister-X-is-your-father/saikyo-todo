/**
 * Phase 6.15 loop iter1466 (mode-F = Flicker detection): useMarkNotificationRead 楽観 update。
 *
 * Bug: useMarkNotificationRead (src/features/notification/hooks.ts) は onSuccess
 * invalidate のみで onMutate 楽観 update を持たず、NotificationBell で 1 件既読
 * click 後 ~200-500ms 待ちで visible が「未読」のまま、unread count badge も
 * 減らない flicker (useToggleCompleteItem iter1013 と同 root cause、notification 既読版)。
 *
 * 修正: fire-and-forget cancelQueries (list + unreadCount 両方) + sync setQueryData。
 *   - list cache の id match notification の readAt を new Date() にセット
 *   - 該当が「未読 → 既読」 transition なら unreadCount を 1 減算 (atomic)
 *   - snapshots / countSnapshot 両方 onError rollback
 *   - onSettled で両 cache invalidate (server canonical 取得)
 *
 * 経路 B: source-side regex assert。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-notification-read-iter1466.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(resolve(process.cwd(), 'src/features/notification/hooks.ts'), 'utf8')

  if (!src.includes('n.id === notificationId && n.readAt === null ? { ...n, readAt: now } : n')) {
    findings.push({
      level: 'error',
      message: 'notification/hooks.ts: useMarkNotificationRead.onMutate readAt セット 不在',
    })
  }
  if (!src.includes('countSnapshot - 1')) {
    findings.push({
      level: 'error',
      message: 'notification/hooks.ts: unreadCount 1 減算 不在',
    })
  }

  console.log(`\n=== Findings (iter1466 Notification read flicker fix) ===`)
  if (findings.length === 0)
    console.log('(なし) — useMarkNotificationRead readAt セット + unreadCount 減算 OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
