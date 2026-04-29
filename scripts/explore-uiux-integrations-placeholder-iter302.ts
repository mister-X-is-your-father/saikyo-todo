/**
 * Phase 6.15 loop iter 302 — integrations-panel.tsx の project IDs input の
 * placeholder が英語 "comma-separated (例: proj-a, proj-b)" の混在文で、
 * JP locale UX と部分的に不整合な問題。
 *
 * 現状: integrations-panel の Source 作成フォームで project IDs (Yamory 等の
 * 連携先 project 識別子) を入力する Input:
 *   <IMEInput placeholder="comma-separated (例: proj-a, proj-b)" .../>
 *
 * "comma-separated" は英語 technical term。JP locale (html lang="ja") では
 * "カンマ区切り" の方が自然。example の "proj-a, proj-b" は英 slug 様式
 * (project IDs は通常 ASCII slug なのでそのまま残す)。
 *
 * 期待 (fix 後):
 *   placeholder = "カンマ区切り (例: proj-a, proj-b)"
 *   sighted user に「カンマで区切って入れる」が JP で明示される。
 *
 * Supabase 必須画面 (integrations-panel は workspace 内) のため runtime
 * 検証は環境依存。source 側 regex assert で fix を verify。
 *
 *   pnpm tsx scripts/explore-uiux-integrations-placeholder-iter302.ts
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
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )

  // 1. 英語 "comma-separated" placeholder が残っていない
  if (/placeholder="comma-separated/.test(src)) {
    findings.push({
      level: 'warning',
      message: `integrations-panel.tsx: placeholder="comma-separated ..." 英語残存`,
    })
  } else {
    findings.push({ level: 'info', message: `placeholder="comma-separated" 残存無し OK` })
  }

  // 2. JP "カンマ区切り" に置換されている
  if (!/placeholder="カンマ区切り/.test(src)) {
    findings.push({
      level: 'warning',
      message: `integrations-panel.tsx: placeholder="カンマ区切り..." が見つからない`,
    })
  } else {
    findings.push({ level: 'info', message: `placeholder="カンマ区切り..." 確認 OK` })
  }

  // 3. example part "(例: proj-a, proj-b)" は維持 (project IDs は ASCII slug)
  if (!/\(例: proj-a, proj-b\)/.test(src)) {
    findings.push({
      level: 'warning',
      message: `integrations-panel.tsx: example "(例: proj-a, proj-b)" が消えている`,
    })
  } else {
    findings.push({ level: 'info', message: `example "(例: proj-a, proj-b)" 維持 OK` })
  }

  console.log(`\n=== Findings (integrations-placeholder-iter302) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
