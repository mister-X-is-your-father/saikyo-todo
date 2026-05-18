/**
 * Phase 6.15 loop iter 951 (mode-D + mode-M) — mock-submit-form の workDate /
 * description / hours input に enterKeyHint="next" / "next" / "send" を追加 (4 input
 * のうち select 1 個を除く 3 input)。mock-login-form (iter950) + login-form / signup-form
 * の mobile keyboard pattern と整合化。
 *
 * 課題: mock-submit-form の 3 IMEInput (workDate / description / hoursDecimal) は
 *   enterKeyHint 未指定。Mobile 仮想キーボードの Enter button が default で表示され、
 *   user は「次の field に進む」 か「form 送信」 か判別不能だった。iter950 で mock-login-form
 *   に enterKeyHint 適用後、本 form だけ unauth 系で漏れの不整合。
 *
 * fix: mock-submit-form.tsx で
 *   1. tsDate input に enterKeyHint="next" (date → category select に進む)
 *   2. tsDescription input に enterKeyHint="next" (description → hours に進む)
 *   3. tsHours input に enterKeyHint="send" (hours → form submit)
 *   category は <select> でキーボード Enter 動作が field 内 option 選択なので enterKeyHint
 *   は適用外。+3/-0 行 (1 file)。視覚 / 動作不変。Mobile keyboard "次へ" / "送信" 翻訳で
 *   form flow 明示。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex で codify + iter950 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/mock-timesheet/mock-submit-form.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. tsDate に enterKeyHint="next"
  const dateMatch = src.match(/id="tsDate"[\s\S]*?\/>/)
  if (!dateMatch) {
    findings.push({ level: 'error', message: `${target}: tsDate input block 不在` })
  } else if (!/enterKeyHint="next"/.test(dateMatch[0])) {
    findings.push({ level: 'warning', message: `${target}: tsDate に enterKeyHint="next" 不在` })
  } else {
    findings.push({ level: 'info', message: `tsDate enterKeyHint="next" OK` })
  }

  // 2. tsDescription に enterKeyHint="next"
  const descMatch = src.match(/id="tsDescription"[\s\S]*?\/>/)
  if (!descMatch) {
    findings.push({ level: 'error', message: `${target}: tsDescription input block 不在` })
  } else if (!/enterKeyHint="next"/.test(descMatch[0])) {
    findings.push({
      level: 'warning',
      message: `${target}: tsDescription に enterKeyHint="next" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `tsDescription enterKeyHint="next" OK` })
  }

  // 3. tsHours に enterKeyHint="send"
  const hoursMatch = src.match(/id="tsHours"[\s\S]*?\/>/)
  if (!hoursMatch) {
    findings.push({ level: 'error', message: `${target}: tsHours input block 不在` })
  } else if (!/enterKeyHint="send"/.test(hoursMatch[0])) {
    findings.push({ level: 'warning', message: `${target}: tsHours に enterKeyHint="send" 不在` })
  } else {
    findings.push({ level: 'info', message: `tsHours enterKeyHint="send" OK` })
  }

  // 4. iter950 invariant: mock-login-form の同 pattern
  const mockLoginSrc = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(mockLoginSrc) || !/enterKeyHint="send"/.test(mockLoginSrc)) {
    findings.push({ level: 'warning', message: `iter950 invariant: mock-login-form 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter950 invariant OK` })
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

  // 6. iter944 invariant: mock-login-form aria-describedby
  if (!/aria-describedby="mock-timesheet-description"/.test(mockLoginSrc)) {
    findings.push({ level: 'warning', message: `iter944 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter944 invariant OK` })
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

  console.log(`\n=== Findings (mock-submit-enter-key-hint-iter951) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
