/**
 * Phase 6.15 loop iter 894 (mode-D Desktop a11y) —
 * inbox-view の row title span (visible {it.title}) を aria-hidden 化、outer div
 * (role="button") の aria-label "${title} を編集ダイアログで開く" 単独経路に統一。
 *
 * 経緯: iter862 で today-view + backlog-view title button visible aria-hidden 化済の続編。
 *   inbox-view は同 pattern (outer role="button" + aria-label に title 含む) だが、
 *   inner title span は aria-hidden 無し → SR が outer aria-label と inner visible を
 *   二重読み上げ。
 *
 * 修正: inner title span に aria-hidden="true" 追加、outer div aria-label 単独経路に統一。
 *   data-testid 維持 (E2E 用 inbox-title-${it.id})。
 *
 * 検証: source-side regex assert + iter735/843/849-893 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')

  // 1. inner title span aria-hidden 追加
  if (
    /<span\s+className="truncate text-left font-medium"[\s\S]+?aria-hidden="true"[\s\S]+?>\s*\{it\.title\}\s*<\/span>/.test(
      iv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `inbox-view inner title span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `inbox-view inner title span aria-hidden 未統合`,
    })
  }

  // 2. outer div aria-label に title 含む維持
  if (/aria-label=\{`\$\{it\.title\} を編集ダイアログで開く`\}/.test(iv)) {
    findings.push({
      level: 'info',
      message: `inbox-view outer div aria-label "${'${title}'} を編集ダイアログで開く" 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `inbox-view outer div aria-label 破壊`,
    })
  }

  // 3. data-testid 維持
  if (
    /data-testid=\{`inbox-title-\$\{it\.id\}`\}/.test(iv) &&
    /data-testid=\{`inbox-row-\$\{it\.id\}`\}/.test(iv)
  ) {
    findings.push({
      level: 'info',
      message: `inbox-view data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `inbox-view data-testid 破壊`,
    })
  }

  // iter862 invariant: today + backlog title aria-hidden
  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{it\.title\}<\/span>/.test(tv) &&
    /<span aria-hidden="true">\{String\(getValue\(\)\)\}<\/span>/.test(bv)
  ) {
    findings.push({
      level: 'info',
      message: `iter862 invariant: today/backlog title aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter862 invariant: 破壊` })
  }

  // iter893 invariant: quick-add calibrated chip aria-hidden
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  if (
    /<span aria-hidden="true">→ \{formatEstimate\(calibrated\.calibratedMinutes\)\}<\/span>/.test(
      qa,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter893 invariant: quick-add calibrated chip aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter893 invariant: 破壊` })
  }

  // iter735 invariant
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

  console.log(`\n=== Findings (inbox-row-title-aria-hidden-iter894) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
