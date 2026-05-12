/**
 * Phase 6.15 loop iter 865 (mode-D Desktop a11y) —
 * personal-period-view.tsx ゴール保存 button 内 visible "ゴール保存" / "保存中…"
 * を aria-hidden span で wrap (iter800-864 sweep の続編)。
 *
 * 課題: personal-period-view.tsx 行 193 の Button は aria-label が完全 content
 *   (期間種別 + 動作内容 + 保存中/不要) を含むのに、内側 visible "ゴール保存" /
 *   "保存中…" は aria-hidden 無し → SR で二重読み可能性。日次 / 週次 / 月次
 *   レビュー画面の goal 保存 button (個人 PDCA review workflow の主要 CTA)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - "ゴール保存" / "保存中…" visible text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/862/863/864 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  const hasInnerHidden =
    /<span aria-hidden="true">\{upsertGoal\.isPending \? '保存中…' : 'ゴール保存'\}<\/span>/.test(
      ppv,
    )
  if (hasInnerHidden) {
    findings.push({
      level: 'info',
      message: `iter865: personal-period-view ゴール保存 button aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter865: ゴール保存 button aria-hidden 不在`,
    })
  }

  // iter864 invariant: integrations-panel 3 button aria-hidden 維持
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

  // iter863 invariant: workflows-panel 3 button aria-hidden 維持
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

  console.log(`\n=== Findings (iter865) ===`)
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
