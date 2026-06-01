/**
 * Phase 6.15 loop iter1671: ItemEditDialog 6 TabsTrigger の aria-label suffix を統一。
 * 旧 "サマリ タブ" / "子タスク タブ" の space-separator を他 tab (基本タブ / 依存タブ /
 * コメントタブ / アクティビティタブ) の no-space noun-compound に揃え、6 tab を統一 format。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-item-tabs-spacing-iter1671.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(
    resolve(here, '../src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )

  // 旧 space-separator が code 行に残存していない
  const lines = src.split('\n')
  const offenders = lines.filter((l) =>
    /aria-label=[`'"][^`'"]*\b(サマリ タブ|子タスク タブ)\b/.test(l),
  )
  if (offenders.length > 0) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `旧 space-separator が残存: ${offenders[0]?.trim().slice(0, 80)}`,
    })
  }

  // 新 no-space convention が着地
  if (!src.includes('"サマリタブ — この案件の進捗 / 依存 / 最終更新を一目で確認"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'サマリタブ aria-label が no-space convention に未着地',
    })
  }
  if (!src.includes("'子タスクタブ'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '子タスクタブ fallback aria-label が no-space convention に未着地',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — ItemEditDialog 6 TabsTrigger aria-label が no-space convention で統一')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
