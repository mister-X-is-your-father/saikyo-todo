/**
 * Phase 6.15 loop iter1467 (mode-F = Flicker detection): useMarkAllNotificationsRead 楽観 update。
 *
 * Bug: useMarkAllNotificationsRead (src/features/notification/hooks.ts) は onSuccess
 * invalidate のみで onMutate 楽観 update を持たず、「全て既読」 button click 後
 * ~200-500ms 待ちで list 全 row の visible が「未読」のままで unread count badge も
 * 0 にならない flicker (useMarkNotificationRead iter1466 と同 root cause、一括版)。
 *
 * 修正: fire-and-forget cancelQueries (list + unreadCount 両方) + sync setQueryData。
 * 全 row の readAt=null を new Date() にセット、unreadCount を 0 にリセット。
 * snapshots / countSnapshot rollback、onSettled invalidate。
 *
 * 経路 B: source-side regex assert + iter1466 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-notification-read-all-iter1467.ts
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

  if (!src.includes('n.readAt === null ? { ...n, readAt: now } : n')) {
    findings.push({
      level: 'error',
      message:
        'notification/hooks.ts: useMarkAllNotificationsRead.onMutate 全 row readAt セット 不在',
    })
  }
  if (!src.includes('qc.setQueryData(notificationKeys.unreadCount(workspaceId), 0)')) {
    findings.push({
      level: 'error',
      message:
        'notification/hooks.ts: useMarkAllNotificationsRead.onMutate unreadCount 0 reset 不在',
    })
  }
  // iter1466 useMarkNotificationRead invariant
  if (!src.includes('n.id === notificationId && n.readAt === null ? { ...n, readAt: now } : n')) {
    findings.push({
      level: 'error',
      message: 'notification/hooks.ts: iter1466 useMarkNotificationRead invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1467 Notification read-all flicker fix) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — useMarkAllNotificationsRead 全 row readAt + unreadCount 0 reset + iter1466 invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
