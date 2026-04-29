/**
 * Phase 6.15 loop iter 301 — goals-panel.tsx の KR target / unit input の
 * placeholder が英語 "target" / "unit (件 / %)" のまま、JP locale UX と不整合。
 *
 * 現状: KR (Key Result) 入力フォームの target / unit input:
 *   <Input placeholder="target" aria-label="目標値" .../>
 *   <Input placeholder="unit (件 / %)" aria-label="単位" .../>
 *
 * aria-label は "目標値" / "単位" で JP 統一済だが visible placeholder は
 * 英語のまま。sighted user が input にフォーカス前に見る placeholder が
 * 英語で「何を入力すべきか」が想像しにくい (technical English term と
 * Japanese-only ユーザの組合せ)。
 *
 * 期待 (fix 後):
 *   placeholder を JP の **例示** 形式に変更:
 *     "target" → "例: 100" (具体的数値 example)
 *     "unit (件 / %)" → "例: 件 / %" (具体的単位 example)
 *   aria-label の "目標値" / "単位" は維持 (SR 用ラベル)。
 *
 * Supabase 必須画面 (goals-panel は workspace 内) のため runtime 検証は
 * 環境依存。source 側 regex assert で fix を verify。
 *
 *   pnpm tsx scripts/explore-uiux-goals-placeholder-iter301.ts
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
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // 1. 英語 placeholder "target" / "unit (件 / %)" が残っていない
  if (/placeholder="target"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `goals-panel.tsx: placeholder="target" 英語残存`,
    })
  } else {
    findings.push({ level: 'info', message: `placeholder="target" 残存無し OK` })
  }
  if (/placeholder="unit \(件 \/ %\)"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `goals-panel.tsx: placeholder="unit (件 / %)" 英語残存`,
    })
  } else {
    findings.push({ level: 'info', message: `placeholder="unit ..." 残存無し OK` })
  }

  // 2. JP の例示 placeholder に置換されている
  if (!/placeholder="例: 100"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `goals-panel.tsx: placeholder="例: 100" が見つからない`,
    })
  } else {
    findings.push({ level: 'info', message: `placeholder="例: 100" 確認 OK` })
  }
  if (!/placeholder="例: 件 \/ %"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `goals-panel.tsx: placeholder="例: 件 / %" が見つからない`,
    })
  } else {
    findings.push({ level: 'info', message: `placeholder="例: 件 / %" 確認 OK` })
  }

  // 3. aria-label "目標値" / "単位" は維持
  if (!/aria-label="目標値"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `goals-panel.tsx: aria-label="目標値" が消えている`,
    })
  }
  if (!/aria-label="単位"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `goals-panel.tsx: aria-label="単位" が消えている`,
    })
  }

  console.log(`\n=== Findings (goals-placeholder-iter301) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
