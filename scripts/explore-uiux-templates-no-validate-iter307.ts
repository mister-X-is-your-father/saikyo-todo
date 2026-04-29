/**
 * Phase 6.15 loop iter 307 — template-items-editor + templates-panel の各
 * 1 form で noValidate 漏れによる dual validation 重複表示。
 *
 * iter303-306 sweep 続編。残り 3 production form のうち 2 つ:
 *   - template-items-editor.tsx line 83: Template item 追加フォーム
 *   - templates-panel.tsx line 83: Template 作成フォーム
 *
 * fix: 各 form に noValidate を追加 (1 行 × 2 ファイル)。
 *
 *   pnpm tsx scripts/explore-uiux-templates-no-validate-iter307.ts
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
    'src/components/template/template-items-editor.tsx',
    'src/components/template/templates-panel.tsx',
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

  console.log(`\n=== Findings (templates-no-validate-iter307) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
