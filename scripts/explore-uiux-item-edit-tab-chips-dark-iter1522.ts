/**
 * Phase 6.15 loop iter1522 (mode-D = chip dark variant補完 sweep continuation):
 * item-edit-dialog.tsx の subtasks tab progress chip (2 tone) と dependencies
 * tab blocker count chip (amber) は light 固定で dark mode で明色 chip 浮き。
 *
 * Bug: src/components/workspace/item-edit-dialog.tsx の 2 location:
 *   - subtasks tab progress chip (line 404-405): 2 tone (complete/default)
 *     complete: `bg-emerald-100 text-emerald-800 ring-emerald-300`
 *     default:  `bg-slate-100   text-slate-700   ring-slate-300`
 *   - dependencies tab blocker count chip (line 428): blocked 時のみ render
 *     blocked: `bg-amber-100 text-amber-800 ring-amber-300`
 * 全 3 variant が light 固定で dark mode で明色 chip が浮く。iter1515-1521 chip
 * dark sweep の続編、本 chip family は `text-{X}-800` (より暗い text) + `ring-1
 * ring-inset` 込みの「強調 chip」 variant、`dark:text-{X}-200` (より明) +
 * `dark:bg-{X}-950/40` + `dark:ring-{X}-800/60` で dark 統合。
 *
 * 修正: 3 variant に `dark:bg-{color}-X dark:text-{color}-200 dark:ring-{color}-Y`
 * を併記:
 *   complete: dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800/60
 *   default:  dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-600/60
 *   blocked:  dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/60
 *
 * 経路 B: source-side regex assert + iter1521 timer-quickadd chip / iter1520
 * subtasks summary invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-item-edit-tab-chips-dark-iter1522.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )

  // 1. subtasks complete tone dark token (iter1521 副 で完了済、choice: 950/40 + text-300 + ring-900/50)
  if (!ied.includes('dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50')) {
    findings.push({
      level: 'error',
      message: 'item-edit-dialog.tsx: subtasks complete tone dark token 不在',
    })
  }
  // 2. subtasks default tone dark token (iter1521 副 で完了済、choice: slate-900/40 + text-300 + ring-700/50)
  if (!ied.includes('dark:bg-slate-900/40 dark:text-slate-300 dark:ring-slate-700/50')) {
    findings.push({
      level: 'error',
      message: 'item-edit-dialog.tsx: subtasks default tone dark token 不在',
    })
  }
  // 3. dependencies blocker tone dark token
  if (!ied.includes('dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/60')) {
    findings.push({
      level: 'error',
      message: 'item-edit-dialog.tsx: dependencies blocker tone dark token 不在',
    })
  }

  // iter1521 timer + quick-add invariant cross-check (回帰 guard)
  const atp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (!atp.includes('dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-300')) {
    findings.push({
      level: 'error',
      message: 'active-timer-panel.tsx: iter1516 calibrated invariant 喪失',
    })
  }

  // iter1520 subtasks summary box invariant cross-check
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (!sp.includes('dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:ring-emerald-900/50')) {
    findings.push({
      level: 'error',
      message: 'subtasks-panel.tsx: iter1520 summary box invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1522 item-edit tab 3 chip dark variant) ===`)
  if (findings.length === 0) console.log('(なし) — 3 chip dark token + iter1516/1520 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
