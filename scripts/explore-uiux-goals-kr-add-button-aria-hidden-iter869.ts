/**
 * Phase 6.15 loop iter 869 (mode-D Desktop a11y) —
 * goals-panel.tsx Key Result 追加 button 内 visible "KR 追加" を aria-hidden span
 * で wrap (iter800-868 sweep の続編、Goal & KR workflow 完結)。
 *
 * 課題: goals-panel.tsx 行 861 の Key Result 追加 button は aria-label が完全
 *   content (KR title 入力チェック / 進捗 / Goal バインド) を含むのに、内側
 *   visible "KR 追加" text は aria-hidden 無し → SR 二重読み可能性。iter867 で
 *   Goal status button を、iter868 で Sprint status button を fix した続編。
 *
 * fix (1 ファイル ~1 行差分):
 *   - "KR 追加" visible text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/866/867/868 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">KR 追加<\/span>/.test(gp)) {
    findings.push({
      level: 'info',
      message: `iter869: goals-panel KR 追加 button aria-hidden span OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter869: KR 追加 button aria-hidden 不在` })
  }

  // iter868 invariant: sprints-panel 9 button aria-hidden 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">期間<\/span>/.test(sp) &&
    /<span aria-hidden="true">稼働開始<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter868 invariant: sprints-panel 9 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter868 invariant: 破壊` })
  }

  // iter867 invariant: goals-panel status button aria-hidden 維持
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

  console.log(`\n=== Findings (iter869) ===`)
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
