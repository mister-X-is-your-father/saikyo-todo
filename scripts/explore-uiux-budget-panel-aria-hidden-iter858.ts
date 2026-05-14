/**
 * Phase 6.15 loop iter858 — budget-panel.tsx の 3 button visible text を aria-hidden
 * span で wrap した regression guard。
 *
 * 対象 button:
 *   1. 上限を変更 button "上限を変更" — edit mode open
 *   2. キャンセル button "キャンセル" — edit cancel
 *   3. 保存 button "{update.isPending ? '保存中…' : '保存'}" — limit + warn threshold save
 *
 * 全 button 既に aria-label に意図 + 対象 + 現在値を完全表現。iter844-857 sweep の続編。
 *
 *   pnpm tsx scripts/explore-uiux-budget-panel-aria-hidden-iter858.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/workspace/budget-panel.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  // 1. 上限を変更 button visible wrap
  if (!/<span aria-hidden="true">上限を変更<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '上限を変更 button visible wrap が無い' })
  }
  // 2. キャンセル button visible wrap (budget-edit-cancel test id 前提の文脈で)
  if (
    !/aria-label="AI 月次コスト上限の編集をキャンセル"[\s\S]{0,80}<span aria-hidden="true">キャンセル<\/span>/.test(
      src,
    )
  ) {
    findings.push({ level: 'error', message: 'キャンセル button visible wrap が無い' })
  }
  // 3. 保存 button visible wrap (動的 text)
  if (!/<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '保存 button visible wrap が無い' })
  }

  // 4. aria-label invariant
  const arias = [
    'AI 月次コスト上限と警告閾値の編集モードを開く',
    'AI 月次コスト上限の編集をキャンセル',
    'AI 月次コスト上限を保存中…',
    'AI 月次コスト上限と警告閾値を保存',
  ]
  for (const a of arias) {
    if (!src.includes(`"${a}"`) && !src.includes(`'${a}'`)) {
      findings.push({ level: 'error', message: `aria-label "${a}" が無い` })
    }
  }

  // 5. iter312 invariant: <form noValidate aria-busy aria-label="AI 月次コスト上限編集フォーム"> 健在
  if (!src.includes('aria-label="AI 月次コスト上限編集フォーム"')) {
    findings.push({
      level: 'error',
      message: 'form aria-label="AI 月次コスト上限編集フォーム" 健在性 NG (iter312)',
    })
  }

  // 6. iter349 invariant: budget-limit input に inputMode="decimal"
  if (!src.includes('inputMode="decimal"')) {
    findings.push({
      level: 'error',
      message: 'inputMode="decimal" 健在性 NG (iter349)',
    })
  }

  // 7. raw visible 単独行残置なし
  const rawRows = src
    .split('\n')
    .filter((line) => /^\s*(上限を変更|キャンセル|保存)\s*$/.test(line))
  if (rawRows.length > 0) {
    findings.push({
      level: 'error',
      message: `raw visible 単独行 ${rawRows.length} 件残存: ${rawRows.map((r) => r.trim()).join(', ')}`,
    })
  }

  console.log(`\n=== Findings (budget-panel-aria-hidden iter858) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
