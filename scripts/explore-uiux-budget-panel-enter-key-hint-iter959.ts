/**
 * Phase 6.15 loop iter 959 (mode-M Mobile) — budget-panel の 2 input (budget-limit /
 * budget-warn) に `enterKeyHint="next" / "send"` を追加、Mobile 仮想キーボードの
 * Enter button を「次フィールドへ」「送信」に明示化。iter950 mock-login / iter951
 * mock-submit 同 pattern を budget-panel inline 編集 form にも展開、enterKeyHint
 * sweep 4 form 目。
 *
 * 課題: budget-panel inline 編集 form の 2 input は inputMode="decimal" のみで
 *   enterKeyHint 未指定、Mobile keyboard で「次の field か submit か」 user が判別不能。
 *   iter949 create-workspace-form / iter950 mock-login-form / iter951 mock-submit-form
 *   で確立した pattern と不整合。
 *
 * fix: budget-panel.tsx で
 *   1. budget-limit input に enterKeyHint="next" (限度額 → 警告閾値 へ進む意図)
 *   2. budget-warn input に enterKeyHint="send" (警告閾値 → form 保存 意図)
 *   +2/-0 行 (1 file)。視覚 / 動作不変。Mobile keyboard "次へ" / "送信" 翻訳で form
 *   flow 明示化。
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
  const target = 'src/components/workspace/budget-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. budget-limit input に enterKeyHint="next"
  const limitMatch = src.match(/data-testid="budget-limit-input"[\s\S]{0,400}/)
  if (!limitMatch) {
    findings.push({ level: 'error', message: `${target}: budget-limit input block 不在` })
  } else {
    const limitContext = src.slice(
      Math.max(0, src.indexOf('budget-limit-input') - 200),
      src.indexOf('budget-limit-input') + 100,
    )
    if (!/enterKeyHint="next"/.test(limitContext)) {
      findings.push({
        level: 'warning',
        message: `${target}: budget-limit input 周辺に enterKeyHint="next" 不在`,
      })
    } else {
      findings.push({ level: 'info', message: `budget-limit enterKeyHint="next" OK` })
    }
  }

  // 2. budget-warn input に enterKeyHint="send"
  const warnContext = src.slice(
    Math.max(0, src.indexOf('budget-warn-input') - 200),
    src.indexOf('budget-warn-input') + 100,
  )
  if (!/enterKeyHint="send"/.test(warnContext)) {
    findings.push({
      level: 'warning',
      message: `${target}: budget-warn input 周辺に enterKeyHint="send" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `budget-warn enterKeyHint="send" OK` })
  }

  // 3. iter958 invariant
  const notifPrefsSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-preferences.tsx'),
    'utf8',
  )
  if (
    !/className="flex min-h-11 cursor-pointer items-start gap-3 text-xs leading-snug"/.test(
      notifPrefsSrc,
    )
  ) {
    findings.push({ level: 'warning', message: `iter958 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter958 invariant OK` })
  }

  // 4. iter951 invariant: mock-submit-form enterKeyHint
  const mockSubmitSrc = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(mockSubmitSrc) || !/enterKeyHint="send"/.test(mockSubmitSrc)) {
    findings.push({ level: 'warning', message: `iter951 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter951 invariant OK` })
  }

  // 5. iter950 invariant: mock-login-form enterKeyHint
  const mockLoginSrc = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(mockLoginSrc) || !/enterKeyHint="send"/.test(mockLoginSrc)) {
    findings.push({ level: 'warning', message: `iter950 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter950 invariant OK` })
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

  console.log(`\n=== Findings (budget-panel-enter-key-hint-iter959) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
