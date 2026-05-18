/**
 * Phase 6.15 loop iter 947 (mode-D Desktop a11y) — /mock-timesheet/new の `<main>` に
 * `aria-label="Mock Timesheet 新規送信"` を付与し、landmark に page-specific 名前を付与。
 * /~offline (iter361/362) + /mock-timesheet/login (iter942) + /mock-timesheet/entries
 * (iter946) と同じ landmark 識別 pattern、unauth/mock 系 4 page で landmark a11y 統一完了。
 *
 * 課題: /mock-timesheet/new の `<main id="main-content" tabIndex={-1}>` は landmark の
 *   accessible name を持たず、SR landmark nav (rotor) で他 page と区別不能。/entries は
 *   既存 h2 "送信済み一覧 (N 件)" を aria-labelledby で参照可能だが、/new は visible な
 *   page-specific 見出し (h1/h2) が無く (MockTopNav 共通 h1 "Mock Timesheet" + MockSubmitForm
 *   aria-label "Mock Timesheet 工数送信フォーム" のみ)、aria-labelledby 候補が無い。
 *
 * fix: page.tsx の <main> に aria-label="Mock Timesheet 新規送信" を直接付与。
 *   +1/-0 行 (1 file)。視覚 / DOM / 動作不変。SR landmark rotor で "Mock Timesheet 新規送信"
 *   が読まれる、metadata title "Mock Timesheet 新規送信 | 最強TODO" と一致。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル 1 行。
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

  // 1. /mock-timesheet/new main aria-label
  const newTarget = 'src/app/mock-timesheet/new/page.tsx'
  const newSrc = readFileSync(resolve(process.cwd(), newTarget), 'utf8')
  if (!/aria-label="Mock Timesheet 新規送信"/.test(newSrc)) {
    findings.push({
      level: 'warning',
      message: `${newTarget}: main に aria-label="Mock Timesheet 新規送信" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `mock-timesheet/new main aria-label OK` })
  }

  // 2. iter946 invariant: /mock-timesheet/entries main aria-labelledby + h2 id
  const entriesSrc = readFileSync(
    resolve(process.cwd(), 'src/app/mock-timesheet/entries/page.tsx'),
    'utf8',
  )
  if (!/aria-labelledby="mock-entries-heading"/.test(entriesSrc)) {
    findings.push({ level: 'warning', message: `iter946 invariant 破壊` })
  } else if (!/<h2\s+id="mock-entries-heading"/.test(entriesSrc)) {
    findings.push({ level: 'warning', message: `iter946 invariant (h2 id) 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter946 invariant OK` })
  }

  // 3. iter942 invariant: /mock-timesheet/login main aria-labelledby + h1 id
  const loginSrc = readFileSync(
    resolve(process.cwd(), 'src/app/mock-timesheet/login/page.tsx'),
    'utf8',
  )
  if (!/aria-labelledby="mock-timesheet-heading"/.test(loginSrc)) {
    findings.push({ level: 'warning', message: `iter942 invariant 破壊` })
  } else if (!/<h1\s+id="mock-timesheet-heading"/.test(loginSrc)) {
    findings.push({ level: 'warning', message: `iter942 invariant (h1 id) 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter942 invariant OK` })
  }

  // 4. iter944 invariant: mock-login-form aria-describedby
  const mockFormSrc = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (!/aria-describedby="mock-timesheet-description"/.test(mockFormSrc)) {
    findings.push({ level: 'warning', message: `iter944 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter944 invariant OK` })
  }

  // 5. iter941 invariant 維持
  const offlineSrc = readFileSync(resolve(process.cwd(), 'src/app/~offline/page.tsx'), 'utf8')
  if (!/<span aria-hidden="true">ホームに戻る<\/span>/.test(offlineSrc)) {
    findings.push({ level: 'warning', message: `iter941 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter941 invariant OK` })
  }
  if (!/aria-labelledby="offline-heading"/.test(offlineSrc)) {
    findings.push({ level: 'warning', message: `iter361 invariant (~/offline) 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter361 invariant (~/offline) OK` })
  }

  // 6. iter945 invariant: app/page.tsx home header aria-label
  const homePageSrc = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  if (!/aria-label="最強TODO ホーム"/.test(homePageSrc)) {
    findings.push({ level: 'warning', message: `iter945 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter945 invariant OK` })
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

  console.log(`\n=== Findings (mock-new-landmark-aria-iter947) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
