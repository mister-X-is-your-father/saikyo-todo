/**
 * Phase 6.15 loop iter 864 (mode-D Desktop a11y) —
 * integrations-panel.tsx Source card 3 button (Pull / 有効化-無効化 / 履歴) 内
 * visible text を aria-hidden span で wrap (iter800-863 sweep の続編、iter863
 * で workflows-panel の同 3 button を fix したのと対称化)。
 *
 * 課題: integrations-panel.tsx 行 170 / 186 / 207 の 3 Button は各 aria-label が
 *   完全 content (Source 名 + 動作内容) を含むのに、内側 visible text (Pull /
 *   有効化-無効化 / 履歴) は aria-hidden 無し → SR で二重読み可能性。
 *   Workflow と External Source は同 pattern の card UI で、iter863 で
 *   workflows-panel を fix したので integrations-panel 側も統一する。
 *
 * fix (1 ファイル ~3 行差分):
 *   - Pull button "Pull 中…/Pull" 内 text を <span aria-hidden="true"> で wrap
 *   - 有効化/無効化 button "{toggle}" 内 text を <span aria-hidden="true"> で wrap
 *   - 履歴 button "履歴" 内 text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/861/862/863 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const pullHidden =
    /<span aria-hidden="true">\{trigger\.isPending \? 'Pull 中…' : 'Pull'\}<\/span>/.test(ip)
  const toggleHidden =
    /<span aria-hidden="true">\{src\.enabled \? '無効化' : '有効化'\}<\/span>/.test(ip)
  const historyHidden = /<span aria-hidden="true">履歴<\/span>/.test(ip)
  if (pullHidden && toggleHidden && historyHidden) {
    findings.push({
      level: 'info',
      message: `iter864: integrations-panel Pull / 有効化-無効化 / 履歴 button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter864: 不完全 (pull=${pullHidden} toggle=${toggleHidden} history=${historyHidden})`,
    })
  }

  // parallel reference: workflows-panel 同 pattern (iter863 で fix 済)
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{wf\.enabled \? '無効化' : '有効化'\}<\/span>/.test(wp) &&
    /<span aria-hidden="true">履歴<\/span>/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `iter864 reference: workflows-panel も同 pattern (iter863 で fix 済)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter864 reference: workflows-panel pattern drift`,
    })
  }

  // iter863 invariant: workflows-panel 3 button aria-hidden 維持
  if (
    /<span aria-hidden="true">編集<\/span>/.test(wp) &&
    /<span aria-hidden="true">履歴<\/span>/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `iter863 invariant: workflows-panel 編集/履歴 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter863 invariant: 破壊` })
  }

  // iter862 invariant: activity-log actor badge aria-hidden 維持
  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{entry\.actorType === 'agent' \? 'AI' : 'user'\}<\/span>/.test(al)
  ) {
    findings.push({
      level: 'info',
      message: `iter862 invariant: activity-log actor badge aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter862 invariant: 破壊` })
  }

  // iter735 invariant: shadcn UI 未編集
  const tabs = readFileSync(resolve(process.cwd(), 'src/components/ui/tabs.tsx'), 'utf8')
  if (!/aria-hidden/.test(tabs)) {
    findings.push({ level: 'info', message: `iter735 invariant: shadcn/tabs.tsx 未編集 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `iter735 invariant: shadcn tabs.tsx に aria-hidden 編集が混入`,
    })
  }

  console.log(`\n=== Findings (iter864) ===`)
  if (findings.length === 0) console.log('(なし)')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
