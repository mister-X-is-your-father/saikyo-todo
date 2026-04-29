/**
 * Phase 6.15 loop iter 354 — ItemEditDialog の 3 input (editTitle / editDescription /
 * editDod) に autoComplete="off" を追加、iter343-350 autoComplete sweep の続編。
 *
 * fix: 3 IMEInput に `autoComplete="off"` を追加 (3 行)。タスク title / description /
 *   DoD は app 固有テキストで browser autoComplete 候補は無関係。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/workspace/item-edit-dialog.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  for (const id of ['editTitle', 'editDescription', 'editDod']) {
    const block = src.match(new RegExp(`<IMEInput[\\s\\S]*?id="${id}"[\\s\\S]*?\\/>`))
    if (!block) {
      findings.push({ level: 'error', message: `${target}: id="${id}" Input not found` })
    } else if (!/autoComplete="off"/.test(block[0])) {
      findings.push({ level: 'warning', message: `${target}: id=${id} autoComplete 不在` })
    }
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: `${target}: 3 input autoComplete OK` })
  }

  console.log(`\n=== Findings (item-dialog-autocomplete-iter354) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
