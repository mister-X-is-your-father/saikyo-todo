/**
 * Phase 6.15 loop iter 944 (mode-D Desktop a11y) — mock-login-form の <form> に
 * `aria-describedby="mock-timesheet-description"` を追加し、page-level description
 * を form field focus 時に SR が読む経路を確立。
 *
 * 課題: iter942 で /mock-timesheet/login の page.tsx に `id="mock-timesheet-description"`
 *   を <p> に付与したが、form 側からは参照されておらず、SR ユーザが email/password input
 *   に focus した時 form の description は未提供だった。一方 login-form (iter 不明) は
 *   `aria-labelledby="login-heading" aria-describedby="login-description"` で page-level
 *   id を form から参照する cross-file pattern が確立済。同 pattern を mock-login-form
 *   にも展開して a11y 構造を整合化。
 *
 * fix: mock-login-form.tsx の <form> tag に `aria-describedby="mock-timesheet-description"`
 *   を追加。aria-label="Mock Timesheet ログインフォーム" は form name として維持
 *   (aria-labelledby に置き換えると h1 text "Mock Timesheet" のみとなり "ログインフォーム"
 *   suffix が落ちる、name 情報後退)。aria-describedby は form 入力 focus 時に
 *   "Playwright 自動入力のテスト対象 mock 外部システム。saikyo-todo とは独立。" を SR が
 *   読む経路を追加 = mock 環境であることを user に明示。
 *   +1/-0 行 (1 file)。視覚 / form 動作不変。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex で codify (mock-login-form.tsx と mock-timesheet/login/page.tsx
 *   の cross-file id 整合性を確認)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. mock-login-form <form> に aria-describedby="mock-timesheet-description"
  const formTarget = 'src/components/mock-timesheet/mock-login-form.tsx'
  const formSrc = readFileSync(resolve(process.cwd(), formTarget), 'utf8')
  if (!/aria-describedby="mock-timesheet-description"/.test(formSrc)) {
    findings.push({
      level: 'warning',
      message: `${formTarget}: <form> に aria-describedby="mock-timesheet-description" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `mock-login-form aria-describedby OK` })
  }

  // 2. mock-login-form aria-label 維持 (regression 検出)
  if (!/aria-label="Mock Timesheet ログインフォーム"/.test(formSrc)) {
    findings.push({
      level: 'warning',
      message: `${formTarget}: aria-label "Mock Timesheet ログインフォーム" 消滅 (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: `mock-login-form aria-label 維持 OK` })
  }

  // 3. mock-timesheet/login page.tsx に id="mock-timesheet-description" (iter942 invariant)
  const pageTarget = 'src/app/mock-timesheet/login/page.tsx'
  const pageSrc = readFileSync(resolve(process.cwd(), pageTarget), 'utf8')
  if (!/id="mock-timesheet-description"/.test(pageSrc)) {
    findings.push({
      level: 'warning',
      message: `iter942 invariant: ${pageTarget} の id="mock-timesheet-description" 破壊 (form の aria-describedby が dangling)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `iter942 invariant (page.tsx id="mock-timesheet-description") OK`,
    })
  }

  // 4. iter942 invariant: main aria-labelledby + aria-describedby
  if (!/aria-labelledby="mock-timesheet-heading"/.test(pageSrc)) {
    findings.push({
      level: 'warning',
      message: `iter942 invariant: main aria-labelledby 破壊`,
    })
  } else {
    findings.push({ level: 'info', message: `iter942 main aria-labelledby OK` })
  }

  // 5. login-form 同 pattern 維持 (cross-file form aria-describedby reference 規約)
  const loginFormTarget = 'src/components/auth/login-form.tsx'
  const loginFormSrc = readFileSync(resolve(process.cwd(), loginFormTarget), 'utf8')
  if (
    !/aria-labelledby="login-heading"\s*\n?\s*aria-describedby="login-description"/.test(
      loginFormSrc,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `login-form invariant: aria-labelledby/describedby pattern 破壊`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `login-form invariant (cross-file id reference) OK`,
    })
  }

  // 6. iter941 invariant 維持
  const offlineSrc = readFileSync(resolve(process.cwd(), 'src/app/~offline/page.tsx'), 'utf8')
  if (!/<span aria-hidden="true">ホームに戻る<\/span>/.test(offlineSrc)) {
    findings.push({
      level: 'warning',
      message: `iter941 invariant: ~/offline Home Link aria-hidden span 破壊`,
    })
  } else {
    findings.push({ level: 'info', message: `iter941 invariant OK` })
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

  console.log(`\n=== Findings (mock-login-form-describedby-iter944) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
