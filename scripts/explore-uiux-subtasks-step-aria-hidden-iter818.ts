/**
 * Phase 6.15 loop iter 818 (mode-D Desktop a11y) —
 * subtasks-panel subtask-step span 内 visible {index + 1} を aria-hidden span で wrap。
 *
 * 課題: subtasks-panel.tsx 行 168-174 の subtask-step span は parent span に
 *   aria-label "${index + 1} 番目 (深さ ${depth + 1})" が付いているのに、内側
 *   visible {index + 1} text は aria-hidden 無し。SR ユーザは aria-label を聞いた後
 *   visible 数値も再度読み上げされる重複。iter800-817 sweep の続編。
 *
 * fix (1 ファイル ~1 行差分):
 *   - {index + 1} を <span aria-hidden="true">{index + 1}</span> に変更
 *
 * 検証: source-side regex assert + iter735-817 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  const hasIndexAriaHidden = /<span aria-hidden="true">\{index \+ 1\}<\/span>/.test(sp)
  if (hasIndexAriaHidden) {
    findings.push({
      level: 'info',
      message: `subtasks-panel subtask-step index aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `subtasks-panel subtask-step index aria-hidden 不完全`,
    })
  }

  // iter817 invariant: recovery-plan rank aria-hidden
  const rps = readFileSync(
    resolve(process.cwd(), 'src/components/item/recovery-plan-section.tsx'),
    'utf8',
  )
  if (
    /text-muted-foreground text-\[10px\] tabular-nums" aria-hidden="true">\s*\n?\s*\{action\.rank\}\./.test(
      rps,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter817 invariant: recovery-plan rank aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter817 invariant: 破壊` })
  }

  // iter816 invariant: backlog estimate summary aria-hidden
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{estimateSummary\}<\/span>/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter816 invariant: backlog estimate summary aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter816 invariant: 破壊` })
  }

  // iter815 invariant: template card button aria-label kind/cron
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Template「\$\{t\.name\}」\(\$\{t\.kind\}\$\{t\.scheduleCron \? ` · \$\{t\.scheduleCron\}` : ''\}\)/.test(
      tp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter815 invariant: template card button aria-label kind/cron 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter815 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor
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

  console.log(`\n=== Findings (subtasks-step-aria-hidden-iter818) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
