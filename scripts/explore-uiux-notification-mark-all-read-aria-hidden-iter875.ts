/**
 * Phase 6.15 loop iter 875 (mode-D Desktop a11y) —
 * notification-bell "全て既読" button visible を aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/notification-bell.tsx 行 190-204 の
 *   notification-mark-all-read button は 3 状態 aria-label が完全 content を
 *   含むのに visible "全て既読" は aria-hidden 無し → SR 2 経路読み上げ重複。
 *   通知 popover 内の主要 mutation control。iter844-874 と同 vocabulary。
 *
 * fix (1 ファイル +1/-1 行):
 *   - <span aria-hidden="true">全て既読</span>
 *
 * 検証: source-side regex assert + iter874 / iter873 invariant cross-check。
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

  if (
    /data-testid="notification-mark-all-read"[\s\S]*?<span aria-hidden="true">全て既読<\/span>/.test(
      nb,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter875: notification-mark-all-read button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter875: notification-mark-all-read button aria-hidden 不完全`,
    })
  }

  // invariant: aria-label 3 状態 / data-testid 維持
  if (
    /aria-label=\{[\s\S]*?'未読通知がないため既読化不要'/.test(nb) &&
    /data-testid="notification-mark-all-read"/.test(nb)
  ) {
    findings.push({
      level: 'info',
      message: `iter875 invariant: notification mark-all-read aria-label 3 状態 + data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter875 invariant: 破壊` })
  }

  // iter874 invariant: gantt jump-today
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">今日へジャンプ<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `iter874 invariant: gantt jump-today 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter874 invariant: 破壊` })
  }

  console.log(`\n=== Findings (notification-mark-all-read-aria-hidden-iter875) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
