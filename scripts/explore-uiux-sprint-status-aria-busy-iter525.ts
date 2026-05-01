/**
 * Phase 6.15 loop iter 525 (mode-D Desktop a11y) —
 * SprintsPanel SprintCard 4 status-change Button (activate / complete / planning / cancel) に
 * aria-busy を補完 (iter521-524 form aria-busy sweep の継続、累計 14 件 button + form 統一)。
 *
 * 課題: sprints-panel.tsx の 4 つの status change Button (sprint-activate /
 *   sprint-complete / sprint-planning / sprint-cancel) は disabled={changing} で
 *   pending 時の入力 block するが aria-busy 不在。aria-label は changing で動的
 *   切替済だが、SR は disabled (= 禁止) と pending (= 処理中) を区別できない。
 *
 * fix (1 ファイル ~4 行差分):
 *   - 4 Button それぞれに aria-busy={changing || undefined} 付与
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、disabled / aria-label /
 * data-testid / variant / icon 全維持、iter472 (Sprint swimlane) invariant 維持。
 *
 * 検証: source-side regex assert + iter515-524 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. sprint-activate aria-busy
  if (
    /data-testid=\{`sprint-activate-\$\{sprint\.id\}`\}/.test(sp) &&
    sp.includes(
      "disabled={changing}\n                aria-busy={changing || undefined}\n                onClick={() => onStatusChange('active')",
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel.tsx: sprint-activate aria-busy 配線 OK`,
    })
  } else {
    // looser fallback
    if (
      sp.includes('data-testid={`sprint-activate-${sprint.id}`}') &&
      /sprint-activate[\s\S]{0,400}aria-busy=\{changing \|\| undefined\}|aria-busy=\{changing \|\| undefined\}[\s\S]{0,400}sprint-activate/.test(
        sp,
      )
    ) {
      findings.push({
        level: 'info',
        message: `sprints-panel.tsx: sprint-activate aria-busy (loose) 配線 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `sprints-panel.tsx: sprint-activate aria-busy 不在`,
      })
    }
  }

  // 2-4. count aria-busy={changing || undefined} occurrences (should be 4)
  const matches = sp.match(/aria-busy=\{changing \|\| undefined\}/g) ?? []
  if (matches.length === 4) {
    findings.push({
      level: 'info',
      message: `sprints-panel.tsx: aria-busy={changing} 出現 4 回 (4 status button) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel.tsx: aria-busy={changing} 出現 ${matches.length} 回 (期待 4)`,
    })
  }

  // 5. data-testid 維持 (sprint-activate / sprint-complete / sprint-cancel)
  if (
    /data-testid=\{`sprint-activate-\$\{sprint\.id\}`\}/.test(sp) &&
    /data-testid=\{`sprint-complete-\$\{sprint\.id\}`\}/.test(sp) &&
    /data-testid=\{`sprint-cancel-\$\{sprint\.id\}`\}/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel.tsx: data-testid (activate / complete / cancel) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel.tsx: data-testid 破壊`,
    })
  }

  // 6. iter515-524 invariant cross-check
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  const ok515 = /aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)
  const ok517 = /aria-label=\{\s*open\s*\?\s*`「\$\{label\}」の差分/.test(al)
  const ok524 =
    /data-testid="budget-save-btn"[\s\S]{0,200}aria-busy=\{update\.isPending \|\| undefined\}|aria-busy=\{update\.isPending \|\| undefined\}[\s\S]{0,200}data-testid="budget-save-btn"/.test(
      bp,
    )
  if (ok515 && ok517 && ok524) {
    findings.push({
      level: 'info',
      message: `iter515-524 invariant: 重要 anchor 3 件維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515-524 invariant: 破壊 (515=${ok515} 517=${ok517} 524=${ok524})`,
    })
  }

  console.log(`\n=== Findings (sprint-status-aria-busy-iter525) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
