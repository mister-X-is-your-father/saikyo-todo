/**
 * Phase 6.15 loop iter867 — item-edit-dialog.tsx の DialogFooter 内 4 archive / baseline
 * button visible text を aria-hidden span で wrap した regression guard。
 *
 * 対象:
 *   1. アーカイブ復元 — `{unarchive.isPending ? '復元中…' : 'アーカイブ復元'}`
 *   2. アーカイブ — `{archive.isPending ? 'アーカイブ中…' : 'アーカイブ'}`
 *   3. ベースライン 記録/更新 (3 状態) — multi-line ternary
 *   4. baseline クリア — `{clearBaseline.isPending ? 'クリア中…' : 'baseline クリア'}`
 *
 *   pnpm tsx scripts/explore-uiux-item-edit-archive-baseline-aria-hidden-iter867.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/workspace/item-edit-dialog.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  if (
    !/<span aria-hidden="true">\{unarchive\.isPending \? '復元中…' : 'アーカイブ復元'\}<\/span>/.test(
      src,
    )
  ) {
    findings.push({ level: 'error', message: 'アーカイブ復元 button visible wrap が無い' })
  }
  if (
    !/<span aria-hidden="true">\{archive\.isPending \? 'アーカイブ中…' : 'アーカイブ'\}<\/span>/.test(
      src,
    )
  ) {
    findings.push({ level: 'error', message: 'アーカイブ button visible wrap が無い' })
  }
  if (!src.includes('<span aria-hidden="true">\n                {setBaseline.isPending')) {
    findings.push({
      level: 'error',
      message: 'ベースライン記録/更新 button visible wrap (multi-line) が無い',
    })
  }
  if (
    !/<span aria-hidden="true">\{clearBaseline\.isPending \? 'クリア中…' : 'baseline クリア'\}<\/span>/.test(
      src,
    )
  ) {
    findings.push({ level: 'error', message: 'baseline クリア button visible wrap が無い' })
  }

  // 既存 wrap regression (iter850 で 6 TabsTrigger / iter839/840 で Save+Cancel+Template wrap)
  // ざっくり tabs aria-hidden 数 確認
  const ahCount = (src.match(/<span aria-hidden="true">/g) ?? []).length
  if (ahCount < 14) {
    findings.push({
      level: 'error',
      message: `aria-hidden span 数 ${ahCount} < 期待 14 (iter839/840/843/850 + 本 iter 4)`,
    })
  }

  // raw 単独行残置なし
  const rawRows = src
    .split('\n')
    .filter((line) =>
      /^\s*(復元中…|アーカイブ復元|アーカイブ中…|アーカイブ|ベースライン更新|ベースライン記録|記録中…|クリア中…|baseline クリア)\s*$/.test(
        line,
      ),
    )
  if (rawRows.length > 0) {
    findings.push({
      level: 'error',
      message: `raw visible 単独行 ${rawRows.length} 件残存: ${rawRows.map((r) => r.trim()).join(', ')}`,
    })
  }

  console.log(`\n=== Findings (item-edit-archive-baseline-aria-hidden iter867) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
