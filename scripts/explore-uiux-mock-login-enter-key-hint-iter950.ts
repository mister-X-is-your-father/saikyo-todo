/**
 * Phase 6.15 loop iter 950 (mode-D Desktop a11y + mode-M Mobile) — mock-login-form の
 * email / password input に `enterKeyHint="next" / "send"` を追加。login-form (iter 不明)
 * の同 pattern に整合化。Mobile 仮想キーボードの Enter button 表記を意味的に揃え、
 * email → password → submit の form flow を mobile でも明示。
 *
 * 課題: mock-login-form は `inputMode="email"` のみで `enterKeyHint` 未指定だった。
 *   Mobile ブラウザ仮想キーボードは default "go" / "enter" / "return" を表示し、
 *   email → password の field 移動か form submit か mobile user が押す前に判別不能。
 *   login-form は email に `enterKeyHint="next"`、password に `enterKeyHint="send"` 既適用、
 *   mock-login-form だけ漏れの不整合。
 *
 * fix: mock-login-form.tsx で
 *   1. tsEmail input に `enterKeyHint="next"` を追加 (Tab/Enter で次 field tsPassword に focus 移動の意図)
 *   2. tsPassword input に `enterKeyHint="send"` を追加 (Enter で form submit の意図)
 *   +2/-0 行 (1 file)。視覚 / 動作不変。Mobile keyboard の Enter button が
 *   "次へ" / "送信" 等の各 OS 翻訳で表示され、user の入力 flow が明示化。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex で codify + login-form pattern との一致確認。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/mock-timesheet/mock-login-form.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. tsEmail に enterKeyHint="next"
  const emailMatch = src.match(/id="tsEmail"[\s\S]*?required/)
  if (!emailMatch) {
    findings.push({ level: 'error', message: `${target}: tsEmail input block 不在` })
  } else if (!/enterKeyHint="next"/.test(emailMatch[0])) {
    findings.push({ level: 'warning', message: `${target}: tsEmail に enterKeyHint="next" 不在` })
  } else {
    findings.push({ level: 'info', message: `tsEmail enterKeyHint="next" OK` })
  }

  // 2. tsPassword に enterKeyHint="send"
  const passwordMatch = src.match(/id="tsPassword"[\s\S]*?required/)
  if (!passwordMatch) {
    findings.push({ level: 'error', message: `${target}: tsPassword input block 不在` })
  } else if (!/enterKeyHint="send"/.test(passwordMatch[0])) {
    findings.push({
      level: 'warning',
      message: `${target}: tsPassword に enterKeyHint="send" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `tsPassword enterKeyHint="send" OK` })
  }

  // 3. login-form invariant: 同 pattern が login-form 側で維持
  const loginSrc = readFileSync(
    resolve(process.cwd(), 'src/components/auth/login-form.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(loginSrc) || !/enterKeyHint="send"/.test(loginSrc)) {
    findings.push({
      level: 'warning',
      message: `login-form invariant: enterKeyHint pattern 破壊`,
    })
  } else {
    findings.push({ level: 'info', message: `login-form invariant OK` })
  }

  // 4. iter944 invariant: mock-login-form aria-describedby (本 file)
  if (!/aria-describedby="mock-timesheet-description"/.test(src)) {
    findings.push({ level: 'warning', message: `iter944 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter944 invariant OK` })
  }

  // 5. iter949 invariant: create-workspace-form ws-name-hint
  const wsFormSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if (!/<p id="ws-name-hint"/.test(wsFormSrc)) {
    findings.push({ level: 'warning', message: `iter949 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter949 invariant OK` })
  }

  // 6. iter735 invariant
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

  console.log(`\n=== Findings (mock-login-enter-key-hint-iter950) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
