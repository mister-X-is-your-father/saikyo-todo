/**
 * Phase 6.15 loop iter859 — integrations-panel.tsx の 4 button visible text を
 * aria-hidden span で wrap した regression guard。
 *
 * 対象 button (External Source Card + 新規作成 form):
 *   1. Pull button — visible `{trigger.isPending ? 'Pull 中…' : 'Pull'}` (Play icon + text)
 *   2. 無効化/有効化 toggle button — visible `{src.enabled ? '無効化' : '有効化'}`
 *   3. 履歴 disclosure button — visible "履歴" (Chevron icon + text)
 *   4. 作成 submit button — visible `{create.isPending ? '作成中…' : '作成'}`
 *
 * 削除 button は icon-only (Trash2) で aria-label のみ、visible text なし → 対象外。
 * iter844-858 sweep の続編。
 *
 *   pnpm tsx scripts/explore-uiux-integrations-panel-aria-hidden-iter859.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/integrations/integrations-panel.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  // 1. Pull button
  if (!/<span aria-hidden="true">\{trigger\.isPending \? 'Pull 中…' : 'Pull'\}<\/span>/.test(src)) {
    findings.push({ level: 'error', message: 'Pull button visible wrap が無い' })
  }
  // 2. 無効化/有効化 toggle
  if (!/<span aria-hidden="true">\{src\.enabled \? '無効化' : '有効化'\}<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '無効化/有効化 toggle visible wrap が無い' })
  }
  // 3. 履歴 disclosure
  if (!/<span aria-hidden="true">履歴<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '履歴 button visible wrap が無い' })
  }
  // 4. 作成 submit
  if (!/<span aria-hidden="true">\{create\.isPending \? '作成中…' : '作成'\}<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '作成 button visible wrap が無い' })
  }

  // 5. raw visible 単独行残置なし (sweep complete)
  const rawRows = src.split('\n').filter((line) => /^\s*(履歴|作成中…|作成)\s*$/.test(line))
  if (rawRows.length > 0) {
    findings.push({
      level: 'error',
      message: `raw visible 単独行 ${rawRows.length} 件残存: ${rawRows.map((r) => r.trim()).join(', ')}`,
    })
  }

  // 6. iter125 invariant: kind discriminated union (yamory + custom-rest)
  if (!src.includes("'yamory'") || !src.includes("'custom-rest'")) {
    findings.push({
      level: 'error',
      message: 'kind discriminated union (yamory + custom-rest) が消えている (iter125)',
    })
  }

  // 7. iter126 invariant: 履歴 disclosure に aria-expanded / aria-controls
  if (!src.includes('aria-expanded={importsOpen}')) {
    findings.push({
      level: 'error',
      message: 'aria-expanded={importsOpen} が消えている (iter126)',
    })
  }

  console.log(`\n=== Findings (integrations-panel-aria-hidden iter859) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
