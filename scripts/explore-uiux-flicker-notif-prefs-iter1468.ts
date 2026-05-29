/**
 * Phase 6.15 loop iter1468 (mode-F = Flicker detection): useUpdateNotificationPreferences 楽観 update。
 *
 * Bug: useUpdateNotificationPreferences は onSuccess invalidate のみで onMutate 楽観
 * update を持たず、NotificationPreferences popover で email チャネル toggle (checkbox)
 * click 後 ~200-500ms 待ちで visible が更新前のまま見える flicker
 * (useUpdateWorkspaceDefaultMode iter1465 と同 root cause、notification 設定版)。
 *
 * 修正: fire-and-forget cancelQueries + sync setQueryData で patch field を既存
 * preferences object と merge spread。snapshot rollback、onSettled invalidate。
 *
 * 経路 B: source-side regex assert。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-notif-prefs-iter1468.ts
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

  if (!src.includes('qc.setQueryData(notificationKeys.preferences(), {')) {
    findings.push({
      level: 'error',
      message: 'notification/hooks.ts: useUpdateNotificationPreferences.onMutate setQueryData 不在',
    })
  }
  if (!src.includes('...(snapshot as Record<string, unknown> | undefined),')) {
    findings.push({
      level: 'error',
      message:
        'notification/hooks.ts: useUpdateNotificationPreferences.onMutate snapshot spread 不在',
    })
  }

  console.log(`\n=== Findings (iter1468 Notification preferences flicker fix) ===`)
  if (findings.length === 0) console.log('(なし) — useUpdateNotificationPreferences patch merge OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
