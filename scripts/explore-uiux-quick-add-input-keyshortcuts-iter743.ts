/**
 * Phase 6.15 loop iter 743 (mode-D Desktop a11y) —
 * quick-add の input (IMEInput) に aria-keyshortcuts="Enter" を追加。
 * iter735-742 の textarea sweep を input にも展開。
 *
 * 課題: quick-add.tsx 行 134-157 の IMEInput は onKeyDown で Enter trap して
 *   submit するが、aria-keyshortcuts attribute が無い。同 form の Submit button
 *   (行 165) は `aria-keyshortcuts="Enter"` 付与済で非対称。Quick Add は最頻出
 *   workflow (タスク追加の hot path) なので SR ユーザに impact 大。
 *
 * fix (1 ファイル ~1 行差分):
 *   - IMEInput に `aria-keyshortcuts="Enter"` を追加
 *
 * 検証: source-side regex assert + iter735-742 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  const qaMatches = qa.match(/aria-keyshortcuts="Enter"/g) ?? []
  if (qaMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `quick-add IMEInput aria-keyshortcuts 追加 OK (${qaMatches.length} 箇所、IMEInput + Submit button)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add aria-keyshortcuts 不完全 (${qaMatches.length} 箇所のみ)`,
    })
  }

  // iter742 invariant: workflows-panel
  const wfp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  const wfpMatches = wfp.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (wfpMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter742 invariant: workflows-panel aria-keyshortcuts 維持 OK (${wfpMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter742 invariant: 破壊` })
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

  console.log(`\n=== Findings (quick-add-input-keyshortcuts-iter743) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
