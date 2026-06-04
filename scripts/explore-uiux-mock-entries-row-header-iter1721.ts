/**
 * Phase 6.15 loop iter1721: mock-entries table の row 内 ID column を <td> → <th scope="row">
 * に変更し、SR が他 column 読み上げ時に row header (= ID) を context として announce 可能に。
 * WCAG 1.3.1 (Info and Relationships) の正しい table structure。
 *
 * 発見した a11y gap:
 *   src/app/mock-timesheet/entries/page.tsx (旧):
 *     <td className="py-2 font-mono text-xs">{e.id.slice(0, 8)}</td>
 *   - ID column は各 row の unique row identifier (entry ID 8 char truncate)
 *   - data cell <td> として markup されており、SR は他 column 読み上げ時に「どの row か」
 *     を identify する row header context を持たない
 *   - WCAG 1.3.1: 正しい table structure では row header は <th scope="row">
 *
 * 影響: SR 利用者が table を読む際に「8a3f4b6c の row、日付 2026-06-04、カテゴリ dev、...」
 *   と読み上げられず、文脈無しで「2026-06-04、dev、...」 と平板に listing される。
 *   row 横断比較や cell 指定 reference が困難。
 *
 * 修正 (src/app/mock-timesheet/entries/page.tsx, 1 line 差替 + 5 line comment):
 *   - <td> → <th scope="row">
 *   - className 末尾に `text-left` (br <th> default `text-center` を打ち消し既存 visual 維持)
 *   - className 末尾に `font-normal` (br <th> default `font-weight: bold` を打ち消し既存 visual 維持)
 *   - 既存 className (py-2 / font-mono / text-xs) は維持、shadcn 編集なし、機能追加なし
 *
 *   SR 読み上げ effect:
 *     旧: 「2026-06-04, dev, PR review, 1.5, 12:34」 (row context 無し)
 *     新: 「row header 8a3f4b6c, 2026-06-04, dev, PR review, 1.5, 12:34」 (row id context あり)
 *
 * 実行: pnpm tsx scripts/explore-uiux-mock-entries-row-header-iter1721.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))

  const mockEntriesPage = readFileSync(
    resolve(here, '../src/app/mock-timesheet/entries/page.tsx'),
    'utf8',
  )

  // --- 1. body row ID cell が <th scope="row"> に切替済 ---
  if (!mockEntriesPage.includes('scope="row"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-entries/page.tsx body の ID cell が <th scope="row"> でない',
    })
  }

  // --- 2. {e.id.slice(0, 8)} body は維持 ---
  if (!mockEntriesPage.includes('{e.id.slice(0, 8)}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-entries/page.tsx ID cell の {e.id.slice(0, 8)} body が消えている',
    })
  }

  // --- 3. 旧 visual を維持する className 存在 (text-left + font-normal) ---
  //   <th> default は font-weight: bold / text-align: center だが、既存 <td> visual と
  //   揃えるため text-left + font-normal で打ち消す必要がある。
  if (!mockEntriesPage.includes('text-left') || !mockEntriesPage.includes('font-normal')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'mock-entries/page.tsx ID <th> に text-left / font-normal が無い (旧 visual divergence)',
    })
  }

  // --- 4. font-mono / text-xs (既存 visual) 維持 ---
  if (
    !mockEntriesPage.match(
      /scope="row"[\s\S]{0,300}font-mono[\s\S]{0,50}text-xs|font-mono[\s\S]{0,50}text-xs[\s\S]{0,300}scope="row"/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-entries/page.tsx ID <th> の font-mono / text-xs 維持確認失敗',
    })
  }

  // --- 5. thead の <th scope="col"> ID は維持 (column header、別意味) ---
  if (!mockEntriesPage.match(/<th scope="col"[\s\S]{0,200}ID/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-entries/page.tsx thead の <th scope="col"> ID column header が消えている',
    })
  }

  // --- 6. iter1720 reference invariant: description <td> title 維持 ---
  if (!mockEntriesPage.includes('title={e.description}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1720 mock-entries description <td> の title={e.description} が消えている',
    })
  }

  // --- 7. iter1719 reference invariant: mock-login main aria-labelledby 維持 ---
  const mockLoginPage = readFileSync(
    resolve(here, '../src/app/mock-timesheet/login/page.tsx'),
    'utf8',
  )
  if (!mockLoginPage.includes('aria-labelledby="mock-login-heading"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1719 mock-login main aria-labelledby="mock-login-heading" が消えている',
    })
  }

  // --- 8. iter1718 reference invariant: mock-top-nav logout brief aria-label 維持 ---
  const mockTopNav = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )
  if (!mockTopNav.includes('aria-label="ログアウト操作"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1718 mock-top-nav logout form aria-label="ログアウト操作" が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — mock-entries body ID cell が <th scope="row"> 化、row header context が SR に届く (WCAG 1.3.1)、iter1720 / iter1719 / iter1718 invariant 不変',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
