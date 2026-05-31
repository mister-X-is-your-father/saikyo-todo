/**
 * Phase 6.15 loop iter1563: workspace-header `<header>` landmark aria-label を
 * visible 冒頭 em-dash 形式に migration (iter1093-1562 sweep convention 着地)。
 *
 * 旧 aria-label `"Workspace: ${title}"` は ':' colon 区切で visible h1 "${title}" を末尾に持ち
 * voice control prefix-matching「click ${title}」 / SR landmark navigation の prefix scan が
 * strict prefix-match で不可 (substring 一致のみ)。iter1553-1562 status/role Badge family +
 * iter1556 workspace-role Badge と同 file 内 pattern、visible 冒頭固定 + em-dash 区切。
 *
 * 修正 (workspace-header.tsx):
 *   "Workspace: ${title}" → "${title} — Workspace"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workspace-header-em-dash-iter1563.ts
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
  const src = readFileSync(
    resolve(here, '../src/components/workspace/workspace-header.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label={`${title} — Workspace`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace-header header aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('aria-label={`Workspace: ${title}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace-header 旧 colon 形式 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — workspace-header header aria-label が em-dash 形式')
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
