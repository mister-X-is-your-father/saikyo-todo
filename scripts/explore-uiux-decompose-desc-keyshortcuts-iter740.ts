/**
 * Phase 6.15 loop iter 740 (mode-D Desktop a11y) —
 * decompose-proposals-panel の description Textarea に aria-keyshortcuts を追加
 * (iter735-739 sweep の続き)。
 *
 * 課題: decompose-proposals-panel.tsx 行 395-423 の 提案 description Textarea は
 *   onKeyDown で Cmd/Ctrl+Enter trap して保存するが、aria-keyshortcuts attribute が無い。
 *   同 row の Save button (iter317 で aria-keyshortcuts 付与済) と非対称。
 *
 * fix (1 ファイル ~1 行差分):
 *   - Textarea に `aria-keyshortcuts="Meta+Enter Control+Enter"` を追加
 *
 * 検証: source-side regex assert + iter735-739 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  const dppMatches = dpp.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (dppMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel desc Textarea aria-keyshortcuts 追加 OK (${dppMatches.length} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel aria-keyshortcuts 不完全 (${dppMatches.length} 箇所のみ)`,
    })
  }

  // iter739 invariant: templates-panel
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  const tpMatches = tp.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tpMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter739 invariant: templates-panel aria-keyshortcuts 維持 OK (${tpMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter739 invariant: 破壊` })
  }

  // iter738 invariant: goals-panel
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

  // iter737 invariant: sprints-panel
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

  console.log(`\n=== Findings (decompose-desc-keyshortcuts-iter740) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
