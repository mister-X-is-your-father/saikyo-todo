/**
 * Phase 6.15 loop iter 623 (mode-D Desktop a11y) —
 * integrations-panel src-name IMEInput aria-label 4-state + aria-invalid 追加
 * (14 input 統一達成、whitespace check 追加)。
 *
 * 課題: integrations-panel.tsx 行 340-348 の src-name IMEInput は <Label htmlFor>
 *   のみで文字数 / 上限が aria 側で expose されない + aria-invalid 未対応。
 *
 * fix (1 ファイル ~10 行差分):
 *   - aria-label 4-state 動的化 (max 200) + aria-invalid 追加
 *   - 空欄 hint に「識別しやすい名前 — 例: Yamory チーム A」 を含める
 *
 * iter622 wf-name pattern を src-name に展開、saikyo-todo 内 動的 aria-label
 * が 14 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-622 invariant cross-check。
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

  // 1. 空欄 hint
  if (
    /name\.length === 0\s*\n?\s*\?\s*'Source 名前 \(必須、最大 200 文字、識別しやすい名前 — 例: Yamory チーム A\)'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `src-name 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `src-name 空欄 hint なし` })
  }

  // 2. 空白のみ hint
  if (
    /name\.trim\(\) === ''\s*\n?\s*\?\s*`Source 名前 \(現在 \$\{name\.length\} \/ 200 文字、空白のみは不正\)`/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `src-name 空白のみ hint OK` })
  } else {
    findings.push({ level: 'warning', message: `src-name 空白のみ hint なし` })
  }

  // 3. 上限近接 hint
  if (
    /name\.length > 180\s*\n?\s*\?\s*`Source 名前 \(現在 \$\{name\.length\} \/ 200 文字、上限近接\)`/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `src-name 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `src-name 上限近接 hint なし` })
  }

  // 4. aria-invalid 追加
  if (/aria-invalid=\{\(name\.length > 0 && name\.trim\(\) === ''\) \|\| undefined\}/.test(ip)) {
    findings.push({ level: 'info', message: `src-name aria-invalid 追加 OK` })
  } else {
    findings.push({ level: 'warning', message: `src-name aria-invalid 追加なし` })
  }

  // 5. iter622 invariant: wf-name 4-state 維持
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /name\.length === 0\s*\n?\s*\?\s*'Workflow 名前 \(必須、最大 200 文字、何を自動化するか分かる名前\)'/.test(
      wp,
    )
  ) {
    findings.push({ level: 'info', message: `iter622 invariant: wf-name 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter622 invariant: 破壊` })
  }

  // 6. iter595 invariant: src-kind 維持
  if (/aria-label=\{`Source 種別 \(現在: \$\{/.test(ip)) {
    findings.push({ level: 'info', message: `iter595 invariant: src-kind 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter595 invariant: 破壊` })
  }

  console.log(`\n=== Findings (src-name-aria-iter623) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
