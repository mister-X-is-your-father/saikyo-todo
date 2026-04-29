/**
 * Phase 6.15 loop iter 339 — sprints-panel の 4 button (Sprint period save /
 * Retro / Pre-mortem / defaults save) + goals-panel の 7 button (status
 * 5 button × goal-decompose × KR-delete) に aria-busy を batch 付与、iter334-338
 * 続編 (Button aria-busy sweep の 22-32 件目達成、合計 11 button)。
 *
 * fix: 各 button の disabled の隣に `aria-busy={X.isPending || undefined}` を追加。
 *
 * 機能追加なし、shadcn 編集なし、影響面 2 ファイル。
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

  // sprints-panel.tsx — 4 button: update / retroPending / premortemPending / upd
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  for (const expr of [
    'aria-busy={update.isPending || undefined}',
    'aria-busy={retroPending || undefined}',
    'aria-busy={premortemPending || undefined}',
    'aria-busy={upd.isPending || undefined}',
  ]) {
    if (!sp.includes(expr)) {
      findings.push({
        level: 'warning',
        message: `sprints-panel.tsx: \"${expr}\" 不在`,
      })
    }
  }

  // goals-panel.tsx — 7 button: 5 update.isPending + decompose.isPending + remove.isPending
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  const updateAriaBusyCount = (gp.match(/aria-busy=\{update\.isPending \|\| undefined\}/g) ?? [])
    .length
  if (updateAriaBusyCount < 5) {
    findings.push({
      level: 'warning',
      message: `goals-panel.tsx: update.isPending aria-busy が 5 button 必要 (現状 ${updateAriaBusyCount} 件)`,
    })
  }
  if (!/aria-busy=\{decompose\.isPending \|\| undefined\}/.test(gp)) {
    findings.push({
      level: 'warning',
      message: 'goals-panel.tsx: decompose.isPending aria-busy 不在',
    })
  }
  if (!/aria-busy=\{remove\.isPending \|\| undefined\}/.test(gp)) {
    findings.push({ level: 'warning', message: 'goals-panel.tsx: remove.isPending aria-busy 不在' })
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: '11 button aria-busy 全付与 OK' })
  }

  console.log(`\n=== Findings (sprints-goals-aria-busy-iter339) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
