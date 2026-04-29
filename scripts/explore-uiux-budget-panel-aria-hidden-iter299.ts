/**
 * Phase 6.15 loop iter 299 — budget-panel.tsx の AlertTriangle (lucide-react)
 * icon が `aria-hidden` 指定無しで a11y tree に露出する漏れ。
 *
 * 現状: budget-panel の budget exceeded alert (line 117-127) は
 *   <div role="alert" ...>
 *     <AlertTriangle className="..." />  // ← aria-hidden 無し
 *     <div>月次上限 (...) に達しました。Agent (...) の新規起動は...</div>
 *   </div>
 * の構造。role="alert" の Live region が text 子で意味を完全に伝えており、
 * AlertTriangle は decorative の警告 icon。aria-hidden 漏れで SR が
 * "graphic" 等を冗長 announce する可能性。
 *
 * iter298 で codebase 内 lucide aria-hidden sweep の続編。codebase 内他で
 * theme-toggle (iter298)、async-states / must-badge (既設定済) と整合させる。
 *
 * 期待 (fix 後):
 *   <AlertTriangle className="..." aria-hidden="true" /> で a11y tree から
 *   除外、role="alert" の text 内容のみ SR に届く。
 *
 * Supabase 必須画面 (BudgetPanel は workspace 内) のため runtime 検証は
 * 環境依存。source 側 regex assert で fix を verify。
 *
 *   pnpm tsx scripts/explore-uiux-budget-panel-aria-hidden-iter299.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const src = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )

  // 1. AlertTriangle に aria-hidden="true" が付いている
  if (!/<AlertTriangle [^>]*aria-hidden="true"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `budget-panel.tsx: <AlertTriangle> に aria-hidden="true" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `<AlertTriangle aria-hidden="true"> 確認 OK` })
  }

  // 2. role="alert" の親 div は維持
  if (!/role="alert"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `budget-panel.tsx: role="alert" が消えている`,
    })
  } else {
    findings.push({ level: 'info', message: `role="alert" 維持 OK` })
  }

  console.log(`\n=== Findings (budget-panel-aria-hidden-iter299) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
