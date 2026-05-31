/**
 * Phase 6.15 loop iter1548: subtasks-panel step number chip ring に dark variant を補完。
 *
 * subtasks-panel の step number chip (line 175-179) は `ring-slate-200` で light 固定、
 * iter1376/1493/1512-1547 chip/ring dark sweep からこぼれていた。同 file の child count chip
 * (iter1535) と同 pattern。`bg-muted text-foreground` は CSS var で theme-aware だが、
 * ring-slate-200 のみ explicit で dark 時に浮く。dark:ring-slate-700 を補完で contrast 整合。
 *
 * 修正 (subtasks-panel.tsx):
 *   ring-1 ring-slate-200 ring-inset
 *   → ring-1 ring-slate-200 ring-inset dark:ring-slate-700
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-subtasks-step-number-ring-dark-iter1548.ts
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

  if (!src.includes('ring-slate-200 ring-inset dark:ring-slate-700')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtasks-panel step number chip に dark:ring-slate-700 が無い',
    })
  }
  if (src.match(/ring-slate-200 ring-inset"[^>]/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtasks-panel step number chip の旧 ring-slate-200 ring-inset (dark なし) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — subtasks-panel step number chip に dark:ring-slate-700 補完済')
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
