/**
 * Phase 6.15 loop iter 350 — QuickAdd input に autoComplete="off" 追加。
 *
 * 課題: workspace 主要 entry point の QuickAdd input は task title 自然言語
 *   入力で、各回新規 / app 固有の用語 (#会議 / 明日 等) なので browser autoComplete
 *   候補は無関係。candidate ドロップダウンが出ると頻繁な hot path 入力中の
 *   集中を阻害。
 *
 * fix: `autoComplete="off"` を追加 (1 行)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル、約 4 行追加 (コメント含)。
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
  const target = 'src/components/workspace/quick-add.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  const block = src.match(/<IMEInput[\s\S]*?id="quick-add-input"[\s\S]*?\/>/)
  if (!block) {
    findings.push({ level: 'error', message: `${target}: quick-add-input not found` })
  } else if (!/autoComplete="off"/.test(block[0])) {
    findings.push({
      level: 'warning',
      message: `${target}: quick-add-input autoComplete="off" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `${target}: quick-add-input autoComplete OK` })
  }

  console.log(`\n=== Findings (quick-add-autocomplete-iter350) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
