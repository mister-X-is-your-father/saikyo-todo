/**
 * Phase 6.15 loop iter 741 (mode-D Desktop a11y) —
 * personal-period-view の Textarea (日次/週次/月次 ゴール) に aria-keyshortcuts を追加
 * (iter735-740 sweep の続き、textarea 系の最終)。
 *
 * 課題: personal-period-view.tsx 行 162-173 の Textarea は onKeyDown で Cmd/Ctrl+Enter
 *   trap して保存するが、aria-keyshortcuts attribute が無い。同 view の Save button
 *   (周辺) と非対称、SR ユーザは Textarea focus 中に shortcut を直接 channel として知れない。
 *
 * fix (1 ファイル ~1 行差分):
 *   - Textarea に `aria-keyshortcuts="Meta+Enter Control+Enter"` を追加
 *
 * 検証: source-side regex assert + iter735-740 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  const ppvMatches = ppv.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (ppvMatches.length >= 1) {
    findings.push({
      level: 'info',
      message: `personal-period-view Textarea aria-keyshortcuts 追加 OK (${ppvMatches.length} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `personal-period-view aria-keyshortcuts 不完全 (${ppvMatches.length} 箇所のみ)`,
    })
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

  console.log(`\n=== Findings (period-goal-keyshortcuts-iter741) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
