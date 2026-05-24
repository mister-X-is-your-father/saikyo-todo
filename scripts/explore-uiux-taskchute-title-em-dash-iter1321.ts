/**
 * Phase 6.15 loop iter1321: taskchute-view.tsx title button aria-label em-dash convention 統一。
 *
 * iter1321 で確認: taskchute-view.tsx の title button aria-label は `${item.title} を編集`
 * という legacy 形式で、iter1226 workspace-mode-selector / iter1093-1225 sweep の em-dash
 * convention (`${visible} — ${descriptive}`) と divergence。visible-prefix 自体は満たすが
 * codebase 全体の SR 読み上げ + style consistency を確保。
 *
 * 修正 (taskchute-view.tsx):
 *   - 旧: `${item.title} を編集`
 *   - 新: `${item.title} — 編集`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-taskchute-title-em-dash-iter1321.ts
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
  const filePath = resolve(here, '../src/components/workspace/taskchute-view.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('aria-label={`${item.title} — 編集`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'taskchute-view title button aria-label が em-dash convention で無い',
    })
  }

  const codeOnly = src
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n')
  if (codeOnly.includes('aria-label={`${item.title} を編集`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 aria-label `${item.title} を編集` (em-dash 非統一) が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — taskchute-view title button aria-label は em-dash convention 統一済')
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
