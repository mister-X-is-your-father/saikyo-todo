/**
 * Phase 6.15 loop iter 625 (mode-D Desktop a11y) —
 * integrations-panel src-token + src-url IMEInput aria-label を 2-state 動的化
 * (17 input 統一達成、token は password 注記 + url は scheme hint)。
 *
 * 課題: src-token (password) と src-url の IMEInput は <Label htmlFor> のみで
 *   文字数が aria 側で expose されない。
 *
 * fix (1 ファイル ~14 行差分、2 input):
 *   - src-token 2-state (空欄: password 注記 / 通常: 文字数 + 非表示注記)
 *   - src-url 2-state (空欄: scheme hint / 通常: 文字数 + endpoint 注記)
 *
 * iter624 proposal-title pattern を src-token + src-url に水平展開、
 * saikyo-todo 内 動的 aria-label が 17 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-624 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )

  // 1. src-token 空欄 hint
  if (
    /token\.length === 0\s*\n?\s*\?\s*'API Token \(必須、Yamory API の secret token、type=password で入力中も非表示\)'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `src-token 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `src-token 空欄 hint なし` })
  }

  // 2. src-token 通常 hint
  if (
    /:\s*`API Token \(現在 \$\{token\.length\} 文字、type=password で内容は SR にも非表示\)`/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `src-token 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `src-token 通常 hint なし` })
  }

  // 3. src-url 空欄 hint
  if (
    /url\.length === 0\s*\n?\s*\?\s*'URL \(必須、https:\/\/ または http:\/\/ で始まる API endpoint\)'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `src-url 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `src-url 空欄 hint なし` })
  }

  // 4. src-url 通常 hint
  if (/:\s*`URL \(現在 \$\{url\.length\} 文字、API endpoint\)`/.test(ip)) {
    findings.push({ level: 'info', message: `src-url 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `src-url 通常 hint なし` })
  }

  // 5. iter624 invariant: proposal-title 4-state 維持
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/title\.length === 0\s*\n?\s*\?\s*'提案タイトル \(必須、最大 500 文字\)'/.test(dpp)) {
    findings.push({ level: 'info', message: `iter624 invariant: proposal-title 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter624 invariant: 破壊` })
  }

  // 6. iter623 invariant: src-name 4-state 維持
  if (
    /name\.length === 0\s*\n?\s*\?\s*'Source 名前 \(必須、最大 200 文字、識別しやすい名前 — 例: Yamory チーム A\)'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `iter623 invariant: src-name 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter623 invariant: 破壊` })
  }

  console.log(`\n=== Findings (src-token-url-aria-iter625) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
