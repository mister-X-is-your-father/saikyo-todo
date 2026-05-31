/**
 * Phase 6.15 loop iter1590: subtasks-panel step number chip aria-label を
 * paren convention から em-dash 区切に統一 (iter1093-1589 sweep convention 着地)。
 *
 * 修正 (subtasks-panel.tsx):
 *   "${index + 1} 番目 (深さ ${depth + 1})" → "${index + 1} 番目 — 深さ ${depth + 1}"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-subtasks-step-em-dash-iter1590.ts
 * 前提: なし (source 直読 invariant)
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
  const src = readFileSync(resolve(here, '../src/components/workspace/subtasks-panel.tsx'), 'utf8')

  if (!src.includes('${index + 1} 番目 — 深さ ${depth + 1}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtasks step chip aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('${index + 1} 番目 (深さ ${depth + 1})')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 paren convention 残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — subtasks step chip aria-label が em-dash 形式')
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
