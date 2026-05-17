/**
 * Phase 6.15 loop iter 920 (mode-D Desktop a11y) —
 * inbox-view 健全性 chip の visible label を aria-hidden 化、parent span aria-label
 * "Inbox 健全性: ${label}" 単独 SR 経路に統一 (iter900-919 続編、chip pattern を inbox 健全性 chip に展開)。
 *
 * 経緯: parent span aria-label "Inbox 健全性: {healthChip.label}" を持つにも関わらず
 *   内側 visible {healthChip.label} は aria-hidden 無し → SR が 2 経路 (prefix 有 / 無)
 *   で同 label を二重読み。
 *
 * 修正 (+1/-1 行、1 file): 内側 visible {healthChip.label} を <span aria-hidden="true">
 *   で wrap。parent aria-label / data-testid / data-severity 維持。
 *
 * 検証: source-side regex assert + iter735/917 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')

  // 1. 健全性 chip 内側 aria-hidden 追加 OK
  if (
    /aria-label=\{`Inbox 健全性: \$\{healthChip\.label\}`\}\s*>\s*<span aria-hidden="true">\{healthChip\.label\}<\/span>/.test(
      iv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `inbox 健全性 chip 内側 aria-hidden 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `inbox 健全性 chip 内側 aria-hidden 欠落`,
    })
  }

  // 2. parent span aria-label / data-testid / data-severity 維持
  if (
    /data-testid="inbox-health-hint"\s*\n\s*data-severity=\{healthChip\.severity\}\s*\n\s*aria-label=\{`Inbox 健全性: \$\{healthChip\.label\}`\}/.test(
      iv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `inbox 健全性 chip parent 属性維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `inbox 健全性 chip parent 属性破壊`,
    })
  }

  // 3. region aria-label 維持
  if (
    /aria-label=\{`Inbox view \(\$\{inbox\.length\} 件、scheduledFor も期限も未設定、健全性: \$\{healthChip\.label\}\)`\}/.test(
      iv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `inbox region aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `inbox region aria-label 破壊`,
    })
  }

  // iter917 invariant: top-items 合計 span 内側 aria-hidden
  const ti = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )
  if (
    /<span className="font-mono tabular-nums" aria-label=\{`合計 \$\{label\}`\}>\s*<span aria-hidden="true">\{label\}<\/span>/.test(
      ti,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter917 invariant: top-items 合計 span 内側 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter917 invariant: 破壊` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (inbox-health-chip-aria-iter920) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
