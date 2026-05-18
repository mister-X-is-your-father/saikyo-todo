/**
 * Phase 6.15 loop iter 954 (mode-D Desktop a11y) — app/(auth)/layout.tsx の `<main>` に
 * `aria-label="認証 (ログイン / サインアップ)"` を付与し、landmark に accessible name を
 * 付与。/~offline (iter361/362) + /mock-timesheet/login (iter942) + /mock-timesheet/new
 * (iter947) + /mock-timesheet/entries (iter946) と同 pattern、全 unauth main で landmark
 * 識別 sweep 飽和。
 *
 * 課題: AuthLayout の `<main>` は landmark の accessible name を持たず、SR landmark nav
 *   (rotor) で /login / /signup どちらも "main" としか出ず page 識別が不能だった (子 page
 *   の h1 は別 layer の構造)。/~offline などは iter361/362 等で対応済、AuthLayout だけ
 *   漏れ。
 *
 * fix: layout.tsx の <main> に aria-label="認証 (ログイン / サインアップ)" を付与。
 *   AuthLayout は login + signup 両 page で共有のため、page-specific aria-labelledby は
 *   不可 (子 page の h1 id は cross-file で参照困難)。汎用 aria-label で「ここは認証 area」
 *   を SR に明示。+1/-0 行 (1 file)。視覚 / 動作不変。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル 1 行。
 *
 * 検証: source-side regex で codify + architecture test 通過確認 (iter952 invariant)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/(auth)/layout.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. main に aria-label="認証 (ログイン / サインアップ)"
  if (!/aria-label="認証 \(ログイン \/ サインアップ\)"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: <main> に aria-label "認証 (ログイン / サインアップ)" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `auth-layout main aria-label OK` })
  }

  // 2. iter952 architecture invariant: id="main-content" + tabIndex={-1}
  if (!/id="main-content"/.test(src)) {
    findings.push({ level: 'warning', message: `iter952 invariant: id 破壊` })
  } else if (!/tabIndex=\{-1\}/.test(src)) {
    findings.push({ level: 'warning', message: `iter952 invariant: tabIndex 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter952 invariant OK` })
  }

  // 3. iter947 invariant: mock-timesheet/new main aria-label
  const newSrc = readFileSync(resolve(process.cwd(), 'src/app/mock-timesheet/new/page.tsx'), 'utf8')
  if (!/aria-label="Mock Timesheet 新規送信"/.test(newSrc)) {
    findings.push({ level: 'warning', message: `iter947 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter947 invariant OK` })
  }

  // 4. iter946 invariant: mock-timesheet/entries main aria-labelledby + h2 id
  const entriesSrc = readFileSync(
    resolve(process.cwd(), 'src/app/mock-timesheet/entries/page.tsx'),
    'utf8',
  )
  if (!/aria-labelledby="mock-entries-heading"/.test(entriesSrc)) {
    findings.push({ level: 'warning', message: `iter946 invariant 破壊` })
  } else if (!/<h2[\s\S]{0,40}id="mock-entries-heading"/.test(entriesSrc)) {
    findings.push({ level: 'warning', message: `iter946 invariant (h2 id) 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter946 invariant OK` })
  }

  // 5. iter953 invariant: mock-entries empty state role/aria-live
  if (
    !/role="status"[\s\S]{0,60}aria-live="polite"|aria-live="polite"[\s\S]{0,60}role="status"/.test(
      entriesSrc,
    )
  ) {
    findings.push({ level: 'warning', message: `iter953 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter953 invariant OK` })
  }

  // 6. iter942 invariant: mock-timesheet/login main aria-labelledby
  const loginPageSrc = readFileSync(
    resolve(process.cwd(), 'src/app/mock-timesheet/login/page.tsx'),
    'utf8',
  )
  if (!/aria-labelledby="mock-timesheet-heading"/.test(loginPageSrc)) {
    findings.push({ level: 'warning', message: `iter942 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter942 invariant OK` })
  }

  // 7. iter941 invariant: ~/offline Home Link aria-hidden span
  const offlineSrc = readFileSync(resolve(process.cwd(), 'src/app/~offline/page.tsx'), 'utf8')
  if (!/<span aria-hidden="true">ホームに戻る<\/span>/.test(offlineSrc)) {
    findings.push({ level: 'warning', message: `iter941 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter941 invariant OK` })
  }

  // 8. iter735 invariant
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

  console.log(`\n=== Findings (auth-layout-aria-label-iter954) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
