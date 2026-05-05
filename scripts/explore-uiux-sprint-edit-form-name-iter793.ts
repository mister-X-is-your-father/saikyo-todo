/**
 * Phase 6.15 loop iter 793 (mode-D Desktop a11y) —
 * sprints-panel SprintCard 期間編集 form aria-label に sprint name 含めて page-specific 化。
 *
 * 課題: sprints-panel.tsx 行 581 の form aria-label="Sprint 編集フォーム" は静的で、
 *   複数 sprint card が edit モードに同時に入っている場合 (rare だが lock UX 的に
 *   発生可能) や、SR ユーザが form landmark navigation する時に形式が「Sprint 編集
 *   フォーム」 で重複し、どの sprint の編集 form か区別できなかった。
 *
 *   iter763 race / iter764 で workspace-header banner / actions group が page title
 *   込みに動的化されたのと同 pattern (page-specific naming sweep)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label を `Sprint「${sprint.name}」期間編集フォーム` に動的化
 *
 * 検証: source-side regex assert + iter735-792 invariant cross-check。
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
  const hasDynamicLabel = /aria-label=\{`Sprint「\$\{sprint\.name\}」期間編集フォーム`\}/.test(sp)
  const oldStaticGone = !sp.includes('aria-label="Sprint 編集フォーム"')
  if (hasDynamicLabel && oldStaticGone) {
    findings.push({
      level: 'info',
      message: `sprints-panel SprintCard 編集 form aria-label dynamic (sprint name) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel 編集 form aria-label 不完全 (dynamic=${hasDynamicLabel} oldGone=${oldStaticGone})`,
    })
  }

  // iter792 invariant: mock-submit-form Submit idle aria-label
  const msf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  if (/'工数を送信 \(mock-timesheet 入力フォーム\)'/.test(msf)) {
    findings.push({
      level: 'info',
      message: `iter792 invariant: mock-submit-form Submit idle aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter792 invariant: 破壊` })
  }

  // iter791 invariant: decompose-proposals DoD aria-label dynamic
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/提案 DoD \(MUST 必須、最大 2000 文字、完了条件を具体記述\)/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `iter791 invariant: decompose-proposals DoD aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter791 invariant: 破壊` })
  }

  // iter790 invariant: mock-login-form Submit idle aria-label
  const mlf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (/'ログイン \(mock-timesheet email \+ password で認証\)'/.test(mlf)) {
    findings.push({
      level: 'info',
      message: `iter790 invariant: mock-login-form Submit idle aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter790 invariant: 破壊` })
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

  console.log(`\n=== Findings (sprint-edit-form-name-iter793) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
