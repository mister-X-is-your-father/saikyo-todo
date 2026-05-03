/**
 * Phase 6.15 loop iter 679 (mode-D Desktop a11y) —
 * Auth (login / signup) cross-link + workspace-list link に focus-visible ring 追加
 * (3 plain Link、iter678 と同 a11y 軸 link 版継続)。
 *
 * 課題:
 *   - app/(auth)/login/page.tsx 行 28 の signup-link Link は focus-visible 無し
 *   - app/(auth)/signup/page.tsx 行 29 の login link Link は focus-visible 無し
 *   - app/page.tsx 行 73 の workspace-link Link (workspace 一覧 row click) は focus-visible 無し
 *   Tailwind 4 reset で keyboard ユーザは focus 不可視。WCAG 2.4.7 違反方向。
 *
 * fix (3 ファイル ~3 行差分):
 *   - 各 className に `focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none` + `rounded`
 *
 * 検証: source-side regex assert + iter515-678 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const lp = readFileSync(resolve(process.cwd(), 'src/app/(auth)/login/page.tsx'), 'utf8')
  const sp = readFileSync(resolve(process.cwd(), 'src/app/(auth)/signup/page.tsx'), 'utf8')
  const ap = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')

  // 1. login signup-link に focus-visible
  if (
    /text-primary focus-visible:ring-ring relative z-10 inline-flex min-h-11 items-center rounded px-2 py-2 underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none/.test(
      lp,
    )
  ) {
    findings.push({ level: 'info', message: `login signup-link focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `login signup-link focus-visible なし` })
  }

  // 2. signup login link に focus-visible (same className 期待値)
  if (
    /text-primary focus-visible:ring-ring relative z-10 inline-flex min-h-11 items-center rounded px-2 py-2 underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `signup login-link focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `signup login-link focus-visible なし` })
  }

  // 3. workspace-link に focus-visible
  if (
    /hover:bg-muted focus-visible:ring-ring block rounded-lg border p-4 transition focus-visible:ring-2 focus-visible:outline-none/.test(
      ap,
    )
  ) {
    findings.push({ level: 'info', message: `workspace-link focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `workspace-link focus-visible なし` })
  }

  // 4. iter678 invariant: archive-title-link 維持
  const aip = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )
  if (
    /text-primary focus-visible:ring-ring rounded hover:underline focus-visible:ring-2 focus-visible:outline-none/.test(
      aip,
    )
  ) {
    findings.push({ level: 'info', message: `iter678 invariant: archive-title-link 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter678 invariant: 破壊` })
  }

  // 5. iter677 invariant: gantt-jump-today 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /text-foreground hover:bg-muted focus-visible:ring-ring relative rounded border px-2 py-0\.5 text-xs before:absolute before:-inset-3 before:content-\[''\] focus-visible:ring-2 focus-visible:outline-none/.test(
      gv,
    )
  ) {
    findings.push({ level: 'info', message: `iter677 invariant: gantt-jump-today 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter677 invariant: 破壊` })
  }

  console.log(`\n=== Findings (auth-workspace-link-focus-iter679) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
