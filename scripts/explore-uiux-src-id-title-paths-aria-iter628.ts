/**
 * Phase 6.15 loop iter 628 (mode-D Desktop a11y) —
 * integrations-panel src-id-path + src-title-path IMEInput aria-label を
 * 2-state 動的化 (22 input 統一達成、必須 JSON path hint)。
 *
 * 課題: src-id-path / src-title-path は <Label htmlFor> のみで文字数 / 入力形式
 *   が aria 側で expose されない。
 *
 * fix (1 ファイル ~14 行差分、2 input):
 *   - id-path 2-state (必須 JSON dot-path、例: id)
 *   - title-path 2-state (必須 JSON dot-path、例: title または name)
 *
 * iter627 src-paths pattern を必須 input に拡張、saikyo-todo 内 動的 aria-label
 * が 22 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-627 invariant cross-check。
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

  // 1. id-path 空欄 hint
  if (
    /idPath\.length === 0\s*\n?\s*\?\s*'id path \(必須、各 item の一意 ID を取り出す JSON dot-path — 例: id\)'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `id-path 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `id-path 空欄 hint なし` })
  }

  // 2. id-path 通常 hint
  if (/:\s*`id path \(現在 \$\{idPath\.length\} 文字、JSON dot-path\)`/.test(ip)) {
    findings.push({ level: 'info', message: `id-path 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `id-path 通常 hint なし` })
  }

  // 3. title-path 空欄 hint
  if (
    /titlePath\.length === 0\s*\n?\s*\?\s*'title path \(必須、各 item のタイトルを取り出す JSON dot-path — 例: title または name\)'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `title-path 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `title-path 空欄 hint なし` })
  }

  // 4. title-path 通常 hint
  if (/:\s*`title path \(現在 \$\{titlePath\.length\} 文字、JSON dot-path\)`/.test(ip)) {
    findings.push({ level: 'info', message: `title-path 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `title-path 通常 hint なし` })
  }

  // 5. iter627 invariant: items-path 維持
  if (
    /itemsPath\.length === 0\s*\n?\s*\?\s*'items path \(任意、JSON dot-path、省略で response root を items 配列とみなす — 例: data\.items\)'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `iter627 invariant: items-path 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter627 invariant: 破壊` })
  }

  // 6. iter626 invariant: src-project-ids 維持
  if (
    /projectIds\.length === 0\s*\n?\s*\?\s*'project IDs \(必須、1 件以上、カンマ区切り — 例: proj-a, proj-b\)'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `iter626 invariant: src-project-ids 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter626 invariant: 破壊` })
  }

  console.log(`\n=== Findings (src-id-title-paths-aria-iter628) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
