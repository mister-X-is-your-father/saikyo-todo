/**
 * Phase 6.15 loop iter 787 (mode-D Desktop a11y) —
 * item-dependencies-panel dep-target select に required + aria-required を追加。
 * iter784 dep-kind と同 form 内の sibling select も対称に揃える。
 *
 * 課題: item-dependencies-panel.tsx 行 202-212 の dep-target select は実質 required
 *   (依存先 Item は必須選択) だが HTML required / aria-required 属性が無い。
 *   iter784 で同 form の dep-kind に required + aria-required 追加したのと整合。
 *
 * fix (1 ファイル ~2 行差分):
 *   - select に `required` + `aria-required="true"` 追加
 *
 * 検証: source-side regex assert + iter735-786 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  const requiredCount = idp.match(/required\s*\n\s*aria-required="true"/g)?.length ?? 0
  if (requiredCount >= 2) {
    findings.push({
      level: 'info',
      message: `item-dependencies-panel に required + aria-required ${requiredCount} 箇所 (kind + target) 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-dependencies-panel に required + aria-required ${requiredCount} 箇所のみ`,
    })
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
      message: `iter786 invariant: mock-login email autoCorrect/spellCheck 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter786 invariant: 破壊` })
  }

  // iter785 invariant: wf-node-error pre role="alert"
  const wfp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /data-testid=\{`wf-node-run-error-\$\{nr\.id\}`\}\s*\n\s*aria-label=\{`node \$\{nr\.nodeId\} のエラー`\}\s*\n\s*role="alert"/.test(
      wfp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter785 invariant: wf-node-error pre role="alert" 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter785 invariant: 破壊` })
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

  console.log(`\n=== Findings (dep-target-required-iter787) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
