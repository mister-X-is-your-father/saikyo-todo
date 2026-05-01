/**
 * Phase 6.15 loop iter 529 (mode-D Desktop a11y) —
 * NotificationBell 「全て既読」 Button に aria-busy を補完。
 *
 * 課題: notification-bell.tsx 行 181-199 の mark-all-read Button は
 *   disabled (= unreadCount === 0 || markAllRead.isPending) +
 *   3 状態 aria-label 動的付与済 (unread=0 / pending / normal) だが aria-busy 不在。
 *   SR は disabled (= 禁止) と pending (= 処理中) を区別できない。
 *
 * fix (1 ファイル ~1 行差分):
 *   - mark-all-read Button に aria-busy={markAllRead.isPending || undefined}
 *
 * iter521-528 form/Button aria-busy sweep の継続。
 * 機能不変、視覚 layout 不変 (min-h-11 維持)、shadcn 編集なし、disabled / aria-label /
 * data-testid / iter427 (popover heading semantic) invariant 維持。
 *
 * 検証: source-side regex assert + iter515-528 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )

  // 1. mark-all-read aria-busy
  if (
    /data-testid="notification-mark-all-read"[\s\S]{0,400}aria-busy=\{markAllRead\.isPending \|\| undefined\}/.test(
      nb,
    ) ||
    /aria-busy=\{markAllRead\.isPending \|\| undefined\}[\s\S]{0,400}data-testid="notification-mark-all-read"/.test(
      nb,
    )
  ) {
    findings.push({
      level: 'info',
      message: `notification-bell.tsx: mark-all-read aria-busy 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-bell.tsx: mark-all-read aria-busy 不在`,
    })
  }

  // 2. 既存 disabled / 3 状態 aria-label / data-testid 維持
  if (
    /disabled=\{unreadCount === 0 \|\| markAllRead\.isPending\}/.test(nb) &&
    /'未読通知がないため既読化不要'/.test(nb) &&
    /未読 \$\{unreadCount\} 件を既読化中…/.test(nb) &&
    /未読 \$\{unreadCount\} 件をすべて既読にする/.test(nb)
  ) {
    findings.push({
      level: 'info',
      message: `notification-bell.tsx: mark-all-read 既存 disabled / 3 状態 aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-bell.tsx: 既存属性破壊`,
    })
  }

  // 3. iter427 popover heading semantic 維持
  if (
    /id="notification-bell-heading"/.test(nb) &&
    /aria-labelledby="notification-bell-heading"/.test(nb)
  ) {
    findings.push({
      level: 'info',
      message: `notification-bell.tsx: iter427 popover heading semantic 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-bell.tsx: iter427 invariant 破壊`,
    })
  }

  // 4. iter515-528 invariant cross-check (anchor 3 件)
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const ok515 = /aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)
  const ok525 = (sp.match(/aria-busy=\{changing \|\| undefined\}/g) ?? []).length === 4
  const ok528 =
    /data-testid=\{`kr-add-btn-\$\{goalId\}`\}[\s\S]{0,300}aria-busy=\{create\.isPending \|\| undefined\}|aria-busy=\{create\.isPending \|\| undefined\}[\s\S]{0,300}data-testid=\{`kr-add-btn-\$\{goalId\}`\}/.test(
      gp,
    )
  if (ok515 && ok525 && ok528) {
    findings.push({
      level: 'info',
      message: `iter515-528 invariant: 重要 anchor 3 件維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515-528 invariant: 破壊 (515=${ok515} 525=${ok525} 528=${ok528})`,
    })
  }

  console.log(`\n=== Findings (notification-mark-all-aria-busy-iter529) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
