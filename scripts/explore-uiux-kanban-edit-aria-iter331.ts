/**
 * Phase 6.15 loop iter 331 — kanban-view の各 card の "編集" button の aria-label
 * を context-rich に + ✎ char に aria-hidden 付与。
 *
 * 課題: kanban-view.tsx の card-edit button は `aria-label="編集"` だけ、
 *   さらに visible 内容が unicode `✎` (U+270E LOWER RIGHT PENCIL) で aria-hidden
 *   無し。SR ユーザは複数 card 並びで連続 "編集 button" を聞いてどの item か区別
 *   できず、ブラウザ実装によっては unicode 名 ("U+270E LOWER RIGHT PENCIL") を
 *   冗長読み上げ (WCAG 1.3.1 Info and Relationships, Level A 違反)。
 *
 * fix: (1) aria-label を `「<item.title>」を編集` に context-rich 化、各 card 区別
 *      可能に。title attr に同文を付与し hover ユーザにも tooltip。
 *      (2) `✎` を `<span aria-hidden="true">✎</span>` でラップして a11y tree から
 *      除外、SR が unicode 名を読み上げないように。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル、約 6 行差替え。
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
  const target = 'src/components/workspace/kanban-view.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (/aria-label="編集"/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: 旧 aria-label="編集" 残存` })
  }
  if (!/aria-label=\{`「\$\{item\.title\}」を編集`\}/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: context-rich aria-label 不在` })
  }
  if (!/<span aria-hidden="true">✎<\/span>/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: ✎ char aria-hidden 不在` })
  }
  if (findings.length === 0) {
    findings.push({ level: 'info', message: `${target}: kanban edit button a11y OK` })
  }

  console.log(`\n=== Findings (kanban-edit-aria-iter331) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
