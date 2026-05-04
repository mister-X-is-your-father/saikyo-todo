/**
 * Phase 6.15 loop iter 739 (mode-D Desktop a11y) —
 * templates-panel の Template description Textarea に aria-keyshortcuts を追加
 * (iter735-738 sweep の続き)。
 *
 * 課題: templates-panel.tsx 行 142-166 の Template description Textarea は
 *   onKeyDown で Cmd/Ctrl+Enter trap して作成するが、aria-keyshortcuts attribute
 *   が無く、同 form の Submit button (行 192) は付与済で非対称。
 *
 * fix (1 ファイル ~1 行差分):
 *   - Textarea に `aria-keyshortcuts="Meta+Enter Control+Enter"` を追加
 *
 * 検証: source-side regex assert + iter720-738 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  const tpMatches = tp.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tpMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `templates-panel desc Textarea aria-keyshortcuts 追加 OK (${tpMatches.length} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates-panel aria-keyshortcuts 不完全 (${tpMatches.length} 箇所のみ)`,
    })
  }

  // iter738 invariant: goals-panel desc 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  const gpMatches = gp.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (gpMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter738 invariant: goals-panel aria-keyshortcuts 維持 OK (${gpMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter738 invariant: 破壊` })
  }

  // iter737 invariant: sprints-panel 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const spMatches = sp.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (spMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter737 invariant: sprints-panel aria-keyshortcuts 維持 OK (${spMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter737 invariant: 破壊` })
  }

  // iter736 invariant: comment-thread 維持
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  const ctMatches = ct.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (ctMatches.length >= 3) {
    findings.push({
      level: 'info',
      message: `iter736 invariant: comment-thread aria-keyshortcuts 維持 OK (${ctMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter736 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor 維持
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

  console.log(`\n=== Findings (templates-desc-keyshortcuts-iter739) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
