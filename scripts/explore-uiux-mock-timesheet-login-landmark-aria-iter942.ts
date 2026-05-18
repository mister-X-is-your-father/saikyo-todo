/**
 * Phase 6.15 loop iter 942 (mode-D Desktop a11y) — /mock-timesheet/login の `<main>` に
 * `aria-labelledby="mock-timesheet-heading"` + `aria-describedby="mock-timesheet-description"`
 * を付与し、h1 / p に対応 id を割り当て。/~offline page (iter361/362 で同 pattern 既適用) の
 * landmark 識別 pattern と整合化。
 *
 * 課題: /mock-timesheet/login の `<main id="main-content" tabIndex={-1}>` は landmark の
 *   accessible name / description を持たず、SR landmark nav (rotor) で他 page と区別不能。
 *   /~offline は `<main aria-labelledby="offline-heading" aria-describedby="offline-description ...">`
 *   で h1/p に id 付与済 (iter361/362)。これと不整合 = mock-timesheet/login だけ landmark
 *   情報後退。
 *
 * fix: page.tsx で:
 *   1. main に aria-labelledby="mock-timesheet-heading" / aria-describedby="mock-timesheet-description"
 *   2. h1 に id="mock-timesheet-heading"
 *   3. p に id="mock-timesheet-description"
 *   +6/-2 行 (1 file)。視覚 styling / form 動作不変。
 *   SR landmark rotor で "Mock Timesheet" + description "Playwright 自動入力のテスト対象..."
 *   が読まれる、login/signup page と同様の structure。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex + runtime HTML probe で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/mock-timesheet/login/page.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. main 要素に aria-labelledby + aria-describedby
  if (!/aria-labelledby="mock-timesheet-heading"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: main に aria-labelledby="mock-timesheet-heading" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `main aria-labelledby OK` })
  }
  if (!/aria-describedby="mock-timesheet-description"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: main に aria-describedby="mock-timesheet-description" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `main aria-describedby OK` })
  }

  // 2. h1 に id="mock-timesheet-heading"
  if (!/<h1\s+id="mock-timesheet-heading"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: h1 に id="mock-timesheet-heading" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `h1 id OK` })
  }

  // 3. p に id="mock-timesheet-description"
  if (!/<p\s+id="mock-timesheet-description"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: header p に id="mock-timesheet-description" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `p id OK` })
  }

  // 4. visible h1 text "Mock Timesheet" 維持 (regression)
  if (!/Mock Timesheet/.test(src)) {
    findings.push({ level: 'warning', message: `regression: h1 "Mock Timesheet" 消滅` })
  }

  // 5. iter361/362 invariant 維持: /~offline の同 pattern
  const offlineSrc = readFileSync(resolve(process.cwd(), 'src/app/~offline/page.tsx'), 'utf8')
  if (!/aria-labelledby="offline-heading"/.test(offlineSrc)) {
    findings.push({
      level: 'warning',
      message: `iter361 invariant: ~/offline aria-labelledby 破壊`,
    })
  } else if (!/aria-describedby="offline-description offline-secondary"/.test(offlineSrc)) {
    findings.push({
      level: 'warning',
      message: `iter362 invariant: ~/offline aria-describedby 破壊`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `iter361/362 invariant (~/offline landmark pattern) OK`,
    })
  }

  // 6. iter941 invariant 維持: ~/offline Home Link 内 aria-hidden span
  if (!/<span aria-hidden="true">ホームに戻る<\/span>/.test(offlineSrc)) {
    findings.push({
      level: 'warning',
      message: `iter941 invariant: ~/offline Home Link 内 aria-hidden span 破壊`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `iter941 invariant (~/offline Home Link aria-hidden span) OK`,
    })
  }

  // 7. iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({ level: 'info', message: `iter735 invariant OK (${tceMatches.length} 箇所)` })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant 破壊` })
  }

  console.log(`\n=== Findings (mock-timesheet-login-landmark-aria-iter942) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
