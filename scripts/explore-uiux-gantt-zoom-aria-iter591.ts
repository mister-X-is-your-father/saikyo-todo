/**
 * Phase 6.15 loop iter 591 (mode-D Desktop a11y) —
 * gantt-view zoom <select> aria-label に current value を埋込み (動的化)。
 *
 * 課題: gantt-view.tsx 行 334-344 の zoom <select> は aria-label が
 *   "Gantt の 1 日あたりの幅" の static で current value (compact/normal/wide) を
 *   expose せず、SR ユーザは選択状態を 1 phrase で確認できない。option text は
 *   日本語 "狭 (24px/day)" / "標準 (40px/day)" / "広 (64px/day)" で OK だが、
 *   AT は label + value を 1 unit で読めると ergonomics 改善。
 *
 * fix (1 ファイル ~9 行差分、iter587/588/589/590 動的 aria-label expose pattern):
 *   - aria-label を動的化: `Gantt の 1 日あたりの幅 (現在: ${jpLabel})`
 *   - 'compact' → '狭 24px/day'
 *   - 'normal'  → '標準 40px/day'
 *   - 'wide'    → '広 64px/day'
 *   - 未知 key → raw fallback で破綻防止
 *
 * 検証: source-side regex assert + iter515-590 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')

  // 1. zoom 'compact' → '狭 24px/day'
  if (/zoom === 'compact'\s*\n?\s*\?\s*'狭 24px\/day'/.test(gv)) {
    findings.push({ level: 'info', message: `zoom 'compact' → '狭 24px/day' 変換 OK` })
  } else {
    findings.push({ level: 'warning', message: `zoom 'compact' 変換なし` })
  }

  // 2. zoom 'normal' → '標準 40px/day'
  if (/zoom === 'normal'\s*\n?\s*\?\s*'標準 40px\/day'/.test(gv)) {
    findings.push({ level: 'info', message: `zoom 'normal' → '標準 40px/day' 変換 OK` })
  } else {
    findings.push({ level: 'warning', message: `zoom 'normal' 変換なし` })
  }

  // 3. zoom 'wide' → '広 64px/day'
  if (/zoom === 'wide'\s*\n?\s*\?\s*'広 64px\/day'/.test(gv)) {
    findings.push({ level: 'info', message: `zoom 'wide' → '広 64px/day' 変換 OK` })
  } else {
    findings.push({ level: 'warning', message: `zoom 'wide' 変換なし` })
  }

  // 4. aria-label が `現在:` を含む動的 template literal
  if (/aria-label=\{`Gantt の 1 日あたりの幅 \(現在: \$\{/.test(gv)) {
    findings.push({ level: 'info', message: `aria-label 動的 template literal OK` })
  } else {
    findings.push({ level: 'warning', message: `aria-label 動的化なし` })
  }

  // 5. iter590 invariant: sprint filter aria-label JP 変換維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/sprintFilter === 'active'\s*\n?\s*\?\s*'稼働中の Sprint'/.test(ib)) {
    findings.push({ level: 'info', message: `iter590 invariant: sprint filter JP 変換維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter590 invariant: 破壊` })
  }

  // 6. iter589 invariant: status filter aria-label JP 変換維持
  if (/statusFilter === 'todo'\s*\n?\s*\?\s*'TODO'/.test(ib)) {
    findings.push({ level: 'info', message: `iter589 invariant: status filter JP 変換維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter589 invariant: 破壊` })
  }

  // 7. iter587 invariant: gantt-view show-deps / hide-done aria-label 維持
  if (
    /aria-label=\{showDeps \? '依存線を表示中 \(クリックで非表示\)' : '依存線を表示する'\}/.test(gv)
  ) {
    findings.push({ level: 'info', message: `iter587 invariant: gantt show-deps 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter587 invariant: 破壊` })
  }

  console.log(`\n=== Findings (gantt-zoom-aria-iter591) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
