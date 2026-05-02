/**
 * Phase 6.15 loop iter 627 (mode-D Desktop a11y) —
 * integrations-panel src-items-path + src-due-path IMEInput aria-label を
 * 2-state 動的化 (20 input 統一達成、JSON dot-path hint)。
 *
 * 課題: src-items-path / src-due-path の任意 input は <Label htmlFor> のみで
 *   文字数 / 入力形式 (JSON dot-path) が aria 側で expose されない。
 *
 * fix (1 ファイル ~14 行差分、2 input):
 *   - src-items-path 2-state (空欄: dot-path hint + 省略時 root / 通常: 文字数 + 形式)
 *   - src-due-path 2-state (空欄: 期日抽出 dot-path hint / 通常: 文字数 + 形式)
 *
 * iter626 src-project-ids pattern を src-items-path + src-due-path に水平展開、
 * saikyo-todo 内 動的 aria-label が 20 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-626 invariant cross-check。
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

  // 1. items-path 空欄 hint
  if (
    /itemsPath\.length === 0\s*\n?\s*\?\s*'items path \(任意、JSON dot-path、省略で response root を items 配列とみなす — 例: data\.items\)'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `items-path 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `items-path 空欄 hint なし` })
  }

  // 2. items-path 通常 hint
  if (/:\s*`items path \(現在 \$\{itemsPath\.length\} 文字、JSON dot-path\)`/.test(ip)) {
    findings.push({ level: 'info', message: `items-path 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `items-path 通常 hint なし` })
  }

  // 3. due-path 空欄 hint
  if (
    /duePath\.length === 0\s*\n?\s*\?\s*'due path \(任意、各 item から期日を取り出す JSON dot-path — 例: due_date\)'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `due-path 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `due-path 空欄 hint なし` })
  }

  // 4. due-path 通常 hint
  if (/:\s*`due path \(現在 \$\{duePath\.length\} 文字、JSON dot-path\)`/.test(ip)) {
    findings.push({ level: 'info', message: `due-path 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `due-path 通常 hint なし` })
  }

  // 5. iter626 invariant: src-project-ids 維持
  if (
    /projectIds\.length === 0\s*\n?\s*\?\s*'project IDs \(必須、1 件以上、カンマ区切り — 例: proj-a, proj-b\)'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `iter626 invariant: src-project-ids 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter626 invariant: 破壊` })
  }

  // 6. iter625 invariant: src-token 維持
  if (
    /token\.length === 0\s*\n?\s*\?\s*'API Token \(必須、Yamory API の secret token、type=password で入力中も非表示\)'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `iter625 invariant: src-token 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter625 invariant: 破壊` })
  }

  console.log(`\n=== Findings (src-paths-aria-iter627) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
