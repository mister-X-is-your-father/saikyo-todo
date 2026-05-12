/**
 * Phase 6.15 loop iter 868 (mode-D Desktop a11y) —
 * sprints-panel.tsx Sprint card 9 button (期間 / 稼働開始 / 完了 / 計画に戻す /
 * 中止 / 振り返り生成 / Pre-mortem 生成 / 期間編集キャンセル / 期間編集保存) 内
 * visible text を aria-hidden span で wrap (iter800-867 sweep の続編、
 * iter867 goals-panel と対称化)。
 *
 * 課題: sprints-panel.tsx の Sprint card 内 9 button は各 aria-label が完全
 *   content を含むのに、内側 visible text は aria-hidden 無し → SR で二重読み。
 *   Sprint 1 row につき最大 7 + 期間編集 form 2 = 9 button。
 *
 * fix (1 ファイル ~9 行差分): 各 button の visible を aria-hidden span で wrap。
 *
 * 検証: source-side regex assert + iter735/865/866/867 invariant cross-check。
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
  const checks = {
    period: /<span aria-hidden="true">期間<\/span>/.test(sp),
    activate: /<span aria-hidden="true">稼働開始<\/span>/.test(sp),
    complete: /<span aria-hidden="true">完了<\/span>/.test(sp),
    revert: /<span aria-hidden="true">計画に戻す<\/span>/.test(sp),
    cancel: /<span aria-hidden="true">中止<\/span>/.test(sp),
    retro:
      /<span aria-hidden="true">\{retroPending \? '振り返り生成中…' : '振り返り生成'\}<\/span>/.test(
        sp,
      ),
    premortem: /<span aria-hidden="true">\s*\{premortemPending/.test(sp),
    periodCancel: /<span aria-hidden="true">キャンセル<\/span>/.test(sp),
    periodSave: /<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(
      sp,
    ),
  }
  const allOk = Object.values(checks).every(Boolean)
  if (allOk) {
    findings.push({
      level: 'info',
      message: `iter868: sprints-panel 9 button aria-hidden span OK`,
    })
  } else {
    const missing = Object.entries(checks)
      .filter(([, v]) => !v)
      .map(([k]) => k)
      .join(',')
    findings.push({
      level: 'warning',
      message: `iter868: 不完全 (missing: ${missing})`,
    })
  }

  // iter867 invariant: goals-panel 5 status button aria-hidden 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">完了<\/span>/.test(gp) &&
    /<span aria-hidden="true">アーカイブ<\/span>/.test(gp)
  ) {
    findings.push({
      level: 'info',
      message: `iter867 invariant: goals-panel status button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter867 invariant: 破壊` })
  }

  // iter866 invariant: notification-bell 全て既読 aria-hidden 維持
  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">全て既読<\/span>/.test(nb)) {
    findings.push({
      level: 'info',
      message: `iter866 invariant: notification-bell aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter866 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter868) ===`)
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
