/**
 * Phase 6.15 loop iter 742 (mode-D Desktop a11y) —
 * workflows-panel の Workflow description Textarea に aria-keyshortcuts を追加
 * (iter735-741 sweep の漏れ補完)。
 *
 * 課題: workflows-panel.tsx 行 128-156 の Workflow description Textarea は
 *   onKeyDown で Cmd/Ctrl+Enter trap して作成するが、aria-keyshortcuts attribute が無い。
 *   同 form の Submit button (行 165) は付与済で非対称。
 *
 * fix (1 ファイル ~1 行差分):
 *   - Textarea に `aria-keyshortcuts="Meta+Enter Control+Enter"` を追加
 *
 * 検証: source-side regex assert + iter735-741 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wfp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  const wfpMatches = wfp.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (wfpMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `workflows-panel desc Textarea aria-keyshortcuts 追加 OK (${wfpMatches.length} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflows-panel aria-keyshortcuts 不完全 (${wfpMatches.length} 箇所のみ)`,
    })
  }

  // iter741 invariant: personal-period-view
  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  const ppvMatches = ppv.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (ppvMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter741 invariant: personal-period-view aria-keyshortcuts 維持 OK (${ppvMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter741 invariant: 破壊` })
  }

  // iter740 invariant: decompose-proposals-panel
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  const dppMatches = dpp.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (dppMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter740 invariant: decompose-proposals-panel aria-keyshortcuts 維持 OK (${dppMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter740 invariant: 破壊` })
  }

  // iter736 invariant: comment-thread
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

  console.log(`\n=== Findings (workflow-desc-keyshortcuts-iter742) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
