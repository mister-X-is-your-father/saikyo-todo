/**
 * Phase 6.15 loop iter 626 (mode-D Desktop a11y) —
 * integrations-panel src-project-ids IMEInput aria-label を 2-state 動的化
 * (18 input 統一達成、カンマ区切り hint を空欄時に明示)。
 *
 * 課題: integrations-panel.tsx 行 391-399 の src-project-ids IMEInput は
 *   <Label htmlFor> のみで文字数が aria 側で expose されず、空欄時の入力指針も
 *   visible placeholder のみ (SR は読み上げづらい)。
 *
 * fix (1 ファイル ~5 行差分):
 *   - aria-label 2-state 動的化:
 *     - 空欄: 'project IDs (必須、1 件以上、カンマ区切り — 例: proj-a, proj-b)'
 *     - 通常: `project IDs (現在 ${length} 文字、カンマ区切り)`
 *
 * iter625 src-token / src-url pattern を src-project-ids に展開、saikyo-todo
 * 内 動的 aria-label が 18 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-625 invariant cross-check。
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
    /projectIds\.length === 0\s*\n?\s*\?\s*'project IDs \(必須、1 件以上、カンマ区切り — 例: proj-a, proj-b\)'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `src-project-ids 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `src-project-ids 空欄 hint なし` })
  }

  // 2. 通常 hint
  if (/:\s*`project IDs \(現在 \$\{projectIds\.length\} 文字、カンマ区切り\)`/.test(ip)) {
    findings.push({ level: 'info', message: `src-project-ids 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `src-project-ids 通常 hint なし` })
  }

  // 3. iter625 invariant: src-token 維持
  if (
    /token\.length === 0\s*\n?\s*\?\s*'API Token \(必須、Yamory API の secret token、type=password で入力中も非表示\)'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `iter625 invariant: src-token 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter625 invariant: 破壊` })
  }

  // 4. iter625 invariant: src-url 維持
  if (
    /url\.length === 0\s*\n?\s*\?\s*'URL \(必須、https:\/\/ または http:\/\/ で始まる API endpoint\)'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `iter625 invariant: src-url 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter625 invariant: 破壊` })
  }

  // 5. iter623 invariant: src-name 維持
  if (
    /name\.length === 0\s*\n?\s*\?\s*'Source 名前 \(必須、最大 200 文字、識別しやすい名前 — 例: Yamory チーム A\)'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `iter623 invariant: src-name 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter623 invariant: 破壊` })
  }

  // 6. iter595 invariant: src-kind 維持
  if (/aria-label=\{`Source 種別 \(現在: \$\{/.test(ip)) {
    findings.push({ level: 'info', message: `iter595 invariant: src-kind 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter595 invariant: 破壊` })
  }

  console.log(`\n=== Findings (src-project-ids-aria-iter626) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
