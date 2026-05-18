/**
 * Phase 6.15 loop iter 946 (mode-D Desktop a11y) — /mock-timesheet/entries の `<main>` に
 * `aria-labelledby="mock-entries-heading"` を付与し、既存 h2 "送信済み一覧 (N 件)" に
 * id を割り当て。/~offline (iter361/362) + /mock-timesheet/login (iter942) の landmark
 * 識別 pattern を /mock-timesheet/entries にも展開、unauth 系 3 page で landmark a11y 統一。
 *
 * 課題: /mock-timesheet/entries の `<main id="main-content" tabIndex={-1}>` は landmark の
 *   accessible name を持たず、SR landmark nav (rotor) で他 page と区別不能だった。
 *   既存 h2 "送信済み一覧 ({entries.length} 件)" は visible で page-specific 情報を持つが
 *   id 未付与のため main から参照されず。
 *
 * fix: page.tsx で
 *   1. main に aria-labelledby="mock-entries-heading"
 *   2. h2 に id="mock-entries-heading"
 *   +4/-2 行 (1 file, JSX format で複数行展開のため net 行数増)。視覚 styling / table 動作不変。
 *   SR landmark rotor で "送信済み一覧 ({N} 件)" が読まれる、件数情報も同時に獲得可能。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/mock-timesheet/entries/page.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. main に aria-labelledby
  if (!/aria-labelledby="mock-entries-heading"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: main に aria-labelledby="mock-entries-heading" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `main aria-labelledby OK` })
  }

  // 2. h2 に id="mock-entries-heading"
  if (!/<h2\s+id="mock-entries-heading"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: h2 に id="mock-entries-heading" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `h2 id OK` })
  }

  // 3. h2 visible text "送信済み一覧" 維持 (regression 検出)
  if (!/送信済み一覧/.test(src)) {
    findings.push({ level: 'warning', message: `regression: h2 "送信済み一覧" 消滅` })
  } else {
    findings.push({ level: 'info', message: `h2 "送信済み一覧" 維持 OK` })
  }

  // 4. iter942 invariant: /mock-timesheet/login の同 pattern
  const loginPageSrc = readFileSync(
    resolve(process.cwd(), 'src/app/mock-timesheet/login/page.tsx'),
    'utf8',
  )
  if (!/aria-labelledby="mock-timesheet-heading"/.test(loginPageSrc)) {
    findings.push({
      level: 'warning',
      message: `iter942 invariant: mock-timesheet/login main aria-labelledby 破壊`,
    })
  } else {
    findings.push({ level: 'info', message: `iter942 invariant OK` })
  }

  // 5. iter944 invariant: mock-login-form aria-describedby
  const mockFormSrc = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (!/aria-describedby="mock-timesheet-description"/.test(mockFormSrc)) {
    findings.push({ level: 'warning', message: `iter944 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter944 invariant OK` })
  }

  // 6. iter945 invariant: app/page.tsx home header aria-label
  const homePageSrc = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  if (!/aria-label="最強TODO ホーム"/.test(homePageSrc)) {
    findings.push({ level: 'warning', message: `iter945 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter945 invariant OK` })
  }
  if (/aria-label=".*ホーム header"/.test(homePageSrc)) {
    findings.push({
      level: 'warning',
      message: `iter945 invariant: redundant " header" suffix が再出現`,
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

  console.log(`\n=== Findings (mock-entries-landmark-aria-iter946) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
