/**
 * Phase 6.15 loop iter1124: tag-picker trigger selected case aria-label visible-prefix regression
 * guard。
 *
 * iter1124 で発見した bug: tag-picker selected case の旧 aria-label "タグを選択 (現在 N 件:
 * tag1, tag2)" は visible "tag1, tag2" を末尾持ち。iter1072 で empty case は visible-prefix 化
 * 済だが selected case は漏れていた。
 *
 * 修正 (tag-picker.tsx): selected aria-label を "tag1, tag2 — タグを選択 (現在 N 件)" に変更。
 *
 * 実 supabase + tag fixture 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-tag-picker-selected-visible-prefix-iter1124.ts
 * 前提: なし
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
  const filePath = resolve(here, '../src/components/workspace/tag-picker.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 新 visible-prefix selected aria-label が存在
  if (!src.includes('} — タグを選択 (現在 ${selectedLabels.length} 件)`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tag-picker selected aria-label が visible-prefix 形式 'tag1, tag2 — タグを選択 (現在 N 件)' でない`,
    })
  }
  // 旧 bare aria-label が残ってないか
  if (src.includes('`タグを選択 (現在 ${selectedLabels.length} 件:')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `旧 bare aria-label 'タグを選択 (現在 N 件: ...)' が残存`,
    })
  }
  // 既存 empty case (iter1072) は維持
  if (!src.includes("'タグなし — タグを選択 (現在なし)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter1072 empty case 'タグなし — タグを選択 (現在なし)' が消失`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — tag-picker trigger 2 case aria-label は visible-prefix 配置済')
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
