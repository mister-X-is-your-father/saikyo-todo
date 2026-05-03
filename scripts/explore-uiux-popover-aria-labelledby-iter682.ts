/**
 * Phase 6.15 loop iter 682 (mode-D Desktop a11y) —
 * notification-bell / notification-preferences PopoverContent に aria-labelledby
 * を追加 (内部 heading h2 を popover の accessible name にバインド)。
 *
 * 課題: notification-bell.tsx 行 149 と notification-preferences.tsx 行 122 の
 *   `<PopoverContent>` (Radix UI) は role="dialog" がデフォルトで auto-set されるが、
 *   accessible name が無い (aria-label / aria-labelledby なし)。SR が dialog に
 *   フォーカスした時、何の dialog か分からない。内部に既に h2 (id="notification-bell-heading"
 *   / "notification-preferences-heading") があるので aria-labelledby で reference するだけ。
 *
 * fix (2 ファイル ~6 行差分):
 *   - PopoverContent に aria-labelledby (既存 h2 ID 参照)
 *   - prettier 整形で props 多行化
 *
 * 検証: source-side regex assert + iter515-681 invariant cross-check。
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
  const np = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-preferences.tsx'),
    'utf8',
  )

  // 1. notification-bell PopoverContent に aria-labelledby
  if (
    /<PopoverContent\s*\n\s*align="end"\s*\n\s*className="w-80 max-w-\[calc\(100vw-1rem\)\] gap-0 p-0"\s*\n\s*aria-labelledby="notification-bell-heading"\s*\n\s*>/.test(
      nb,
    )
  ) {
    findings.push({ level: 'info', message: `notification-bell PopoverContent labelledby OK` })
  } else {
    findings.push({ level: 'warning', message: `notification-bell PopoverContent labelledby なし` })
  }

  // 2. notification-preferences PopoverContent に aria-labelledby
  if (
    /<PopoverContent\s*\n\s*align="end"\s*\n\s*className="w-80 max-w-\[calc\(100vw-1rem\)\] gap-0 p-0"\s*\n\s*aria-labelledby="notification-preferences-heading"\s*\n\s*>/.test(
      np,
    )
  ) {
    findings.push({
      level: 'info',
      message: `notification-preferences PopoverContent labelledby OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-preferences PopoverContent labelledby なし`,
    })
  }

  // 3. h2 ID 既存 (notification-bell-heading)
  if (/id="notification-bell-heading"/.test(nb)) {
    findings.push({ level: 'info', message: `notification-bell h2 ID 既存維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `notification-bell h2 ID 破壊` })
  }

  // 4. h2 ID 既存 (notification-preferences-heading)
  if (/id="notification-preferences-heading"/.test(np)) {
    findings.push({ level: 'info', message: `notification-preferences h2 ID 既存維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `notification-preferences h2 ID 破壊` })
  }

  // 5. iter681 invariant: backlog-title 維持
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (
    /'hover:text-primary focus-visible:ring-ring rounded text-left hover:underline focus-visible:ring-2 focus-visible:outline-none /.test(
      bv,
    )
  ) {
    findings.push({ level: 'info', message: `iter681 invariant: backlog-title 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter681 invariant: 破壊` })
  }

  console.log(`\n=== Findings (popover-aria-labelledby-iter682) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
