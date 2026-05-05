/**
 * Phase 6.15 loop iter 819 (mode-D Desktop a11y) —
 * sprints-panel sprint progress visible "{done} / {total} ({pct}%)" span を
 * aria-hidden 化 (sibling progressbar が同じ aria-label を持つので重複)。
 *
 * 課題: sprints-panel.tsx 行 528-538 の 完了率 visible span ({done} / {total} ({pct}%))
 *   は sibling progressbar (行 540-565) の aria-label / aria-valuetext に同じ情報が
 *   含まれているのに aria-hidden 無し。SR ユーザは progressbar focus → 読まれる
 *   aria-label に対し、sibling visible 数値も別途読まれる重複。iter800-818 sweep の続編。
 *
 * fix (1 ファイル ~1 行差分):
 *   - 完了率 visible span に aria-hidden="true" 追加
 *
 * 検証: source-side regex assert + iter735-818 invariant cross-check。
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
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const hasPctAriaHidden =
    /\}`\}\s*\n?\s*aria-hidden="true"\s*\n?\s*>\s*\n?\s*\{done\} \/ \{total\} \(\{pct\}%\)/.test(sp)
  if (hasPctAriaHidden) {
    findings.push({
      level: 'info',
      message: `sprint progress visible % chip aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint progress visible % chip aria-hidden 不完全`,
    })
  }

  // iter818 invariant: subtasks-step index aria-hidden
  const sub = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{index \+ 1\}<\/span>/.test(sub)) {
    findings.push({
      level: 'info',
      message: `iter818 invariant: subtasks-step index aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter818 invariant: 破壊` })
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

  console.log(`\n=== Findings (sprint-progress-pct-aria-hidden-iter819) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
