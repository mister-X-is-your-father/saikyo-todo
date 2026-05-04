/**
 * Phase 6.15 loop iter 788 (mode-D Desktop a11y) —
 * workspace-mode-selector radiogroup を aria-describedby で hint 段落と連携。
 *
 * 課題: workspace-mode-selector.tsx 行 166-169 の hint paragraph
 *   ("URL ?mode=taskchute 等で...") は radiogroup の補足説明だが id がなく
 *   radiogroup から参照されていない。SR ユーザは radiogroup に focus した時に
 *   hint を聞き逃す。
 *
 * fix (1 ファイル ~3 行差分):
 *   - hint paragraph に id="workspace-mode-hint" 付与
 *   - radiogroup に aria-describedby="workspace-mode-hint" 追加
 *
 * 検証: source-side regex assert + iter735-787 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wms = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )
  const hasDescribedBy = /aria-describedby="workspace-mode-hint"/.test(wms)
  const hasHintId = /id="workspace-mode-hint"/.test(wms)
  if (hasDescribedBy && hasHintId) {
    findings.push({
      level: 'info',
      message: `workspace-mode-selector radiogroup aria-describedby + hint id 連携 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workspace-mode-selector aria-describedby + hint id 不完全`,
    })
  }

  // iter787 invariant: dep-target select required
  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  const idpRequired = idp.match(/required\s*\n\s*aria-required="true"/g)?.length ?? 0
  if (idpRequired >= 2) {
    findings.push({
      level: 'info',
      message: `iter787 invariant: dep-kind + dep-target required 維持 OK (${idpRequired} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter787 invariant: 破壊` })
  }

  // iter786 invariant: mock-login email autoCorrect
  const mlf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (
    /inputMode="email"\s*\n\s*autoCorrect="off"\s*\n\s*autoCapitalize="none"\s*\n\s*spellCheck=\{false\}/.test(
      mlf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter786 invariant: mock-login email autoCorrect 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter786 invariant: 破壊` })
  }

  // iter752 invariant: backlog-view empty state
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/role="status"\s*\n\s*aria-live="polite"/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter752 invariant: backlog-view empty state 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter752 invariant: 破壊` })
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

  console.log(`\n=== Findings (mode-selector-hint-aria-iter788) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
