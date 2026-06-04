/**
 * Phase 6.15 loop iter 381 — `MockTopNav` の semantic / a11y polish (nav landmark +
 * logout aria-label + sessionId SR contextualize)。
 *
 * 課題: src/components/mock-timesheet/mock-top-nav.tsx は <header> + <h1> までは
 *   semantic だが
 *   - link 群が `<div>` で wrap (nav landmark なし) → SR の landmark navigation
 *     ('D' で next landmark) で nav として識別されず、新規入力 / 入力一覧 への
 *     skip 不可
 *   - logout `<form>` + `<Button>ログアウト</Button>` は context (どこから
 *     logout するか) が button text のみで disambiguate 不能 (workspace 全体の
 *     logout と区別できない)、SR で「ログアウト」だけ単独 announce される
 *   - sessionId 表示 "ログイン中: <id>" は visual には情報的だが、SR は
 *     "ログイン中: <id>" を 1 segment で読み上げ、id の役割 (session 識別子)
 *     が context に出ない
 *
 * fix: src/components/mock-timesheet/mock-top-nav.tsx に 3 点を追加
 *   (1 file 約 14 line 差替、機能追加なし、shadcn 編集なし)。
 *   1. link 群の `<div>` を `<nav aria-label="mock-timesheet ナビゲーション">`
 *      に置換 (landmark + label)
 *   2. logout `<form>` に `aria-label="mock-timesheet からログアウト"`、
 *      内部 `<Button>` に `aria-label="mock-timesheet session をログアウト"`
 *      を追加 (form group / button 共に context 明示、二重で安全)
 *   3. sessionId 表示を 3 span 構成に (sr-only "現在の session ID: " /
 *      aria-hidden "ログイン中: " / font-mono <id>) で SR には semantic な
 *      label、visual には既存表示維持
 *
 * 検証: source-side regex assert で codify。mock-timesheet route は mock
 *   session 必須 + auth 必須のため cloud env で full integration test 不可、
 *   source-side audit で代替。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/mock-timesheet/mock-top-nav.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. nav landmark + aria-label
  if (!/<nav\s+aria-label="mock-timesheet ナビゲーション"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: <nav aria-label="mock-timesheet ナビゲーション"> wrap が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'nav landmark OK' })
  }

  // 2. logout form aria-label
  if (
    !/<form\s+action=\{mockLogoutAction\}\s+aria-label="mock-timesheet からログアウト"/.test(src)
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: logout <form> に aria-label が無い`,
    })
  }

  // 3. logout button aria-label
  if (!/aria-label="mock-timesheet session をログアウト"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: logout <Button> に aria-label が無い`,
    })
  }

  // 4. sessionId SR contextualize (sr-only / aria-hidden / font-mono の 3 span)
  //    iter1722: visible truncate + title 化で sr-only に full sessionId を入れ、
  //    aria-hidden span 内に visible 用 nested font-mono span (8 char + ellipsis) を
  //    持つ構造に変更。regex を新構造に追従。
  if (!/<span className="sr-only">現在の session ID: \{sessionId\}<\/span>/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: sessionId の sr-only label span (full sessionId 含む) が無い`,
    })
  }
  if (!/<span aria-hidden="true">[\s\S]*?ログイン中: [\s\S]*?<\/span>/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: sessionId の aria-hidden visual prefix span が無い`,
    })
  }
  if (!/<span className="font-mono">\{sessionId\.slice\(0, 8\)\}…<\/span>/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: sessionId の font-mono truncate span (iter1722 8 char + ellipsis) が無い`,
    })
  }

  // 5. iter378 / iter379 / iter380 invariant 維持 (regression guard、同 series 隣接 iter)
  for (const f of [
    'src/components/mock-timesheet/mock-login-form.tsx',
    'src/components/mock-timesheet/mock-submit-form.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (!/function onInvalid\(errors:/.test(s) || !/handleSubmit\(onSubmit, onInvalid\)/.test(s)) {
      findings.push({
        level: 'warning',
        message: `${f}: iter378/iter379 onInvalid pattern が消えた (regression)`,
      })
    }
  }
  const entriesSrc = readFileSync(
    resolve(process.cwd(), 'src/app/mock-timesheet/entries/page.tsx'),
    'utf8',
  )
  if (
    !/<caption[^>]*className="sr-only"/.test(entriesSrc) ||
    (entriesSrc.match(/scope="col"/g) ?? []).length < 6
  ) {
    findings.push({
      level: 'warning',
      message: 'mock-timesheet/entries/page.tsx: iter380 caption / scope=col pattern が消えた',
    })
  }

  console.log(`\n=== Findings (mock-top-nav-iter381) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
