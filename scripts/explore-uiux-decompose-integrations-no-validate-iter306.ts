/**
 * Phase 6.15 loop iter 306 — decompose-proposals-panel + integrations-panel
 * の各 1 form で noValidate 漏れによる dual validation 重複表示。
 *
 * iter303 (create-workspace) / iter304 (sprints × 3) / iter305 (goals × 2)
 * の noValidate sweep 続編。
 *
 *   - decompose-proposals-panel.tsx line 329: AI proposal 編集フォーム
 *   - integrations-panel.tsx line 286: Source 作成フォーム
 *
 * 期待 (fix 後):
 *   各 form に noValidate を追加 (1 行 × 2 ファイル)。zod 単一統一。
 *
 *   pnpm tsx scripts/explore-uiux-decompose-integrations-no-validate-iter306.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function checkFile(path: string): { count: number; withNV: number } {
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')
  const count = (src.match(/<form\b/g) ?? []).length
  const withNV = src
    .split(/<form\b/)
    .slice(1)
    .filter((after) => {
      const tagEnd = after.indexOf('>')
      if (tagEnd === -1) return false
      return /\bnoValidate\b/.test(after.slice(0, tagEnd))
    }).length
  return { count, withNV }
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const targets = [
    'src/components/workspace/decompose-proposals-panel.tsx',
    'src/components/integrations/integrations-panel.tsx',
  ]
  for (const f of targets) {
    const { count, withNV } = checkFile(f)
    findings.push({
      level: 'info',
      message: `${f}: <form>=${count}, noValidate=${withNV}`,
    })
    if (count !== withNV) {
      findings.push({
        level: 'warning',
        message: `${f}: ${count - withNV} 個の <form> に noValidate 漏れ`,
      })
    }
  }

  console.log(`\n=== Findings (decompose-integrations-no-validate-iter306) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
