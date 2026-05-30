/**
 * Phase 6.15 loop iter1522: budget-panel warn chip + item-edit-dialog subtasks progress
 * chip (complete/incomplete) に dark variant を補完 (mode-D contrast、iter1376/1493/1512-
 * 1521 chip pattern 継続)。
 *
 * 修正:
 *   budget-panel.tsx (line 116): 警告 chip amber
 *     `bg-amber-100 text-amber-700` → + `dark:bg-amber-950/40 dark:text-amber-300`
 *   item-edit-dialog.tsx (line 404-405): subtasks progress chip (complete/incomplete)
 *     complete:   `bg-emerald-100 text-emerald-800 ring-emerald-300`
 *               → + `dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50`
 *     incomplete: `bg-slate-100 text-slate-700 ring-slate-300`
 *               → + `dark:bg-slate-900/40 dark:text-slate-300 dark:ring-slate-700/50`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-budget-warn-subtask-progress-dark-iter1522.ts
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
  const bp = readFileSync(resolve(here, '../src/components/workspace/budget-panel.tsx'), 'utf8')
  const ied = readFileSync(
    resolve(here, '../src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )

  if (
    !bp.includes(
      'bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'budget-panel warn chip に dark variant が無い',
    })
  }
  if (
    !ied.includes(
      "'bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50'",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-edit-dialog subtasks-progress complete chip に dark variant が無い',
    })
  }
  if (
    !ied.includes(
      "'bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-900/40 dark:text-slate-300 dark:ring-slate-700/50'",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-edit-dialog subtasks-progress incomplete chip に dark variant が無い',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — budget-panel warn + item-edit-dialog subtasks progress chip に dark variant 補完済',
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
