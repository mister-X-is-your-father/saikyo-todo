/**
 * Phase 6.15 loop iter 862 (mode-D Desktop a11y) —
 * create-time-entry-form 記録 + time-entries-table Sync button:
 * WCAG 2.5.3 (Label in Name) 違反を修正 + iter844-861 pattern 統一。
 *
 * 課題:
 *  1. create-time-entry-form 記録 submit (create-time-entry-submit): visible
 *     pending "..." (ASCII 3 dots) は aria-label "稼働記録を作成中…"
 *     (Unicode HORIZONTAL ELLIPSIS) と完全別 string、idle visible "記録" は
 *     aria-label "稼働記録を作成" の "稼働記録" 内 substring を満たすが
 *     pending path で WCAG 2.5.3 失敗、加えて visible vocab "記録" と
 *     aria-label vocab "作成" が action 動詞不一致。
 *  2. time-entries-table Sync button (time-entry-sync-{id}): visible
 *     "Sync" / "再Sync" は aria-label substring OK だが iter844-861 pattern
 *     統一。
 *
 * fix (2 ファイル ~3 行差分):
 *   - 両 button visible 全 path を <span aria-hidden="true"> で wrap、
 *     aria-label 単独経路に統一 (iter844-861 同 pattern)。
 *   - aria-label の 稼働記録 / Sync 文脈は維持。
 *
 * 検証: source-side regex assert + iter735-861 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const cef = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )

  // 1. create-time-entry-submit visible aria-hidden
  if (
    /<span aria-hidden="true">\{create\.isPending \? '\.\.\.' : '記録'\}<\/span>/.test(cef)
  ) {
    findings.push({
      level: 'info',
      message: `create-time-entry-submit visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-time-entry-submit visible aria-hidden 未統合`,
    })
  }

  // 2. create-time-entry-submit aria-label 維持
  if (/aria-label=\{create\.isPending \? '稼働記録を作成中…' : '稼働記録を作成'\}/.test(cef)) {
    findings.push({
      level: 'info',
      message: `create-time-entry-submit aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-time-entry-submit aria-label 文脈破壊`,
    })
  }

  const tet = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )

  // 3. time-entry-sync visible aria-hidden
  if (
    /<span aria-hidden="true">\s*\{e\.syncStatus === 'failed' \? '再Sync' : 'Sync'\}\s*<\/span>/.test(
      tet,
    )
  ) {
    findings.push({
      level: 'info',
      message: `time-entry-sync visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `time-entry-sync visible aria-hidden 未統合`,
    })
  }

  // 4. time-entry-sync data-testid 維持
  if (/data-testid=\{`time-entry-sync-\$\{e\.id\}`\}/.test(tet)) {
    findings.push({
      level: 'info',
      message: `time-entry-sync data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `time-entry-sync data-testid 破壊` })
  }

  // iter861 invariant: schedule-picker interrupt-add visible aria-hidden
  const sip = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">割込みとして追加<\/span>/.test(sip)) {
    findings.push({
      level: 'info',
      message: `iter861 invariant: schedule-picker interrupt-add visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter861 invariant 破壊` })
  }

  // iter860 invariant: today-view quick-add empty CTA aria-hidden
  const tv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/today-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(tv)) {
    findings.push({
      level: 'info',
      message: `iter860 invariant: today-view quick-add aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter860 invariant 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (time-entry-form-aria-hidden-iter862) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
