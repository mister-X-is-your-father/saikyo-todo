/**
 * Phase 6.15 loop iter1720: mock-entries page table の description column に
 * `title={e.description}` を付与し、truncate された text を sighted users が hover で
 * 全文 disclose できるようにする (a11y/UX polish for sighted)。
 *
 * 発見した UX gap:
 *   src/app/mock-timesheet/entries/page.tsx line 80 旧:
 *     <td className="max-w-[280px] truncate py-2">{e.description}</td>
 *   - `truncate` で 280px 超は visual ellipsis (...)、sighted は切れた部分を見れない
 *   - `title` 属性無し → browser tooltip も無し
 *   - SR は DOM テキスト full 読み上げ済 (no-op)、issue は sighted のみ
 *
 * 影響: 開発者が long description を持つ entry を一覧確認する際、視認のみで全文確認が
 *   不可能。row click で詳細展開する mechanism も無いため (mock-entries は read-only
 *   table)、hover tooltip だけが唯一の disclosure 経路。
 *
 * 修正 (src/app/mock-timesheet/entries/page.tsx, 1 line + 5 line comment):
 *   <td> に `title={e.description}` 属性追加、className / textContent は完全不変。
 *   browser native tooltip で全文 disclose、SR は影響なし (既に full text 読む)、
 *   shadcn 編集なし、機能追加なし (DOM 属性のみ)。
 *
 * 実行: pnpm tsx scripts/explore-uiux-mock-entries-truncate-title-iter1720.ts
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

  // --- 1. description <td> に title={e.description} 付与済 ---
  //   max-w-[280px] truncate py-2 className を持つ <td> が title prop を含むかチェック。
  if (!mockEntriesPage.includes('title={e.description}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-entries/page.tsx description <td> に title={e.description} が無い',
    })
  }

  // --- 2. truncate className 維持 ---
  if (!mockEntriesPage.includes('max-w-[280px] truncate')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'mock-entries/page.tsx description <td> の max-w-[280px] truncate className が消えている',
    })
  }

  // --- 3. {e.description} body も維持 (textContent = full text、SR 読む) ---
  if (!mockEntriesPage.includes('{e.description}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-entries/page.tsx description <td> body {e.description} が消えている',
    })
  }

  // --- 4. table caption / data-testid 不変 (sibling 回帰 guard) ---
  if (!mockEntriesPage.includes('data-testid="mock-entries-table"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-entries/page.tsx table の data-testid="mock-entries-table" が消えている',
    })
  }
  if (
    !mockEntriesPage.includes(
      '送信済み工数 {entries.length} 件 (列: ID / 日付 / カテゴリ / 作業内容 / 時間 / 送信時刻)',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-entries/page.tsx caption テキストが変化している',
    })
  }

  // --- 5. empty state は role="status" + aria-live="polite" 維持 ---
  if (
    !mockEntriesPage.includes('role="status"') ||
    !mockEntriesPage.includes('data-testid="mock-entries-empty"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-entries/page.tsx empty state の role/data-testid が変化している',
    })
  }

  // --- 6. iter1719 reference invariant: mock-login main aria-labelledby 維持 ---
  const mockLoginPage = readFileSync(
    resolve(here, '../src/app/mock-timesheet/login/page.tsx'),
    'utf8',
  )
  if (!mockLoginPage.includes('aria-labelledby="mock-login-heading"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'iter1719 mock-login/page.tsx main aria-labelledby="mock-login-heading" が消えている',
    })
  }

  // --- 7. iter1718 reference invariant: mock-top-nav logout brief aria-label 維持 ---
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

  // --- 8. iter1717 reference invariant: mock-login-form data-testid 2 個維持 ---
  const mockLoginForm = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (
    !mockLoginForm.includes('data-testid="mock-login-form"') ||
    !mockLoginForm.includes('data-testid="mock-login-submit"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1717 mock-login-form data-testid 2 個のいずれかが消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — mock-entries description <td> に title 付与で sighted hover tooltip 有効、SR no-op、iter1719 / iter1718 / iter1717 invariant 不変',
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
