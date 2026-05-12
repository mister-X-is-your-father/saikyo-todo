/**
 * Phase 6.15 loop iter 866 (mode-D Desktop a11y) —
 * notification-bell.tsx 「全て既読」 button 内 visible text を aria-hidden span で
 * wrap (iter800-865 sweep の続編)。
 *
 * 課題: notification-bell.tsx 行 203 の 「全て既読」 Button は aria-label が
 *   完全 content (未読件数 + 既読化中 / 不要 等の状態) を含むのに、内側
 *   visible "全て既読" text は aria-hidden 無し → SR で二重読み可能性。
 *   Workspace header 通知 popover の主要 CTA。
 *
 * fix (1 ファイル ~1 行差分):
 *   - "全て既読" visible text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/863/864/865 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  const hasInnerHidden = /<span aria-hidden="true">全て既読<\/span>/.test(nb)
  if (hasInnerHidden) {
    findings.push({
      level: 'info',
      message: `iter866: notification-bell 全て既読 button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter866: 全て既読 button aria-hidden 不在`,
    })
  }

  // iter865 invariant: personal-period-view ゴール保存 aria-hidden 維持
  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{upsertGoal\.isPending \? '保存中…' : 'ゴール保存'\}<\/span>/.test(
      ppv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter865 invariant: personal-period-view ゴール保存 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter865 invariant: 破壊` })
  }

  // iter864 invariant: integrations-panel aria-hidden 維持
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">履歴<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter864 invariant: integrations-panel aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter864 invariant: 破壊` })
  }

  // iter863 invariant: workflows-panel aria-hidden 維持
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">編集<\/span>/.test(wp) &&
    /<span aria-hidden="true">履歴<\/span>/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `iter863 invariant: workflows-panel aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter863 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter866) ===`)
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
