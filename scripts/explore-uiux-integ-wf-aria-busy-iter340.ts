/**
 * Phase 6.15 loop iter 340 — integrations-panel (4 button: Pull / toggle /
 * delete / create) + workflows-panel (5 button: create / run / toggle / delete /
 * run-rerun) に aria-busy を batch 付与、iter334-339 続編 (Button aria-busy
 * sweep の 33-41 件目達成、累計 41 button)。
 *
 * fix: 各 button の disabled の隣に `aria-busy={X.isPending || undefined}` を追加
 *   (9 箇所, 9 行追加)。
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

  // integrations-panel: trigger / update / del / create
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  for (const mut of ['trigger', 'update', 'del', 'create']) {
    const re = new RegExp(`aria-busy=\\{${mut}\\.isPending \\|\\| undefined\\}`)
    if (!re.test(ip)) {
      findings.push({
        level: 'warning',
        message: `integrations-panel.tsx: aria-busy=${mut}.isPending 不在`,
      })
    }
  }

  // workflows-panel: trigger / update / del / create (trigger is in 2 buttons)
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  const triggerCount = (wp.match(/aria-busy=\{trigger\.isPending \|\| undefined\}/g) ?? []).length
  if (triggerCount < 2) {
    findings.push({
      level: 'warning',
      message: `workflows-panel.tsx: trigger.isPending aria-busy が 2 button 必要 (現状 ${triggerCount} 件)`,
    })
  }
  for (const mut of ['update', 'del', 'create']) {
    const re = new RegExp(`aria-busy=\\{${mut}\\.isPending \\|\\| undefined\\}`)
    if (!re.test(wp)) {
      findings.push({
        level: 'warning',
        message: `workflows-panel.tsx: aria-busy=${mut}.isPending 不在`,
      })
    }
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: '9 button aria-busy 全付与 OK' })
  }

  console.log(`\n=== Findings (integ-wf-aria-busy-iter340) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
