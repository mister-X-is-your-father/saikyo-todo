/**
 * Phase 6.15 loop iter2345: command-palette CommandInput に title 付与し aria-label
 * と sync (Cmd+K palette の dual-mode operator (= コマンド検索 + ? prefix item 検索) を
 * sighted hover で disclose、tag-picker / assignee-picker CommandInput sibling と pair の
 * picker input family の先頭 element)。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))

  const cp = readFileSync(resolve(here, '../src/components/shared/command-palette.tsx'), 'utf8')
  if (!cp.includes('iter2345')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'command-palette iter2345 marker が無い',
    })
  }
  // aria-label + title 計 2 回出現
  const text = (cp.match(/コマンドパレット — コマンド名 or \? でタスクを fuzzy 検索/g) || []).length
  if (text < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `command-palette CommandInput 出現 ${text} 回、aria-label + title 計 2 回必要`,
    })
  }

  // 既存 sibling CommandItem (iter1750 + priority dot iter1867) regression 検査
  if (!cp.includes('iter1750')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1750 palette item title が消えている',
    })
  }
  if (!cp.includes('iter1867')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1867 priority dot title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — command-palette CommandInput title sync 完了、Cmd+K palette dual-mode operator (? prefix item 検索) を hover disclose、picker CommandInput input family 先頭 element',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
