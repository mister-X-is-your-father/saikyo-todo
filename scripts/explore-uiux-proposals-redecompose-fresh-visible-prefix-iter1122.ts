/**
 * Phase 6.15 loop iter1122: proposals-redecompose-fresh button aria-label visible-prefix
 * regression guard。
 *
 * iter1122 で発見した bug: 旧 aria-label "保留中の N 件を全て却下してから AI 分解をやり直し" は
 * visible "やり直し" を末尾持ち、voice control prefix-matching match 不可。iter1093-1121 sweep
 * convention に合わせ visible 冒頭固定。
 *
 * 修正 (decompose-proposals-panel.tsx): "やり直し — 保留中の N 件を全て却下してから AI 分解をやり直し"
 *
 * 実 supabase + proposal fixture 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-proposals-redecompose-fresh-visible-prefix-iter1122.ts
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
  const filePath = resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('やり直し — 保留中の ${list.length} 件を全て却下してから AI 分解をやり直し')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `proposals-redecompose-fresh aria-label が visible-prefix 形式でない`,
    })
  }
  // 旧 bare aria-label が残ってないか
  if (src.includes('`保留中の ${list.length} 件を全て却下してから AI 分解をやり直し`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `旧 bare aria-label '保留中の N 件を全て却下してから AI 分解をやり直し' が残存`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — proposals-redecompose-fresh aria-label は visible-prefix 配置済')
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
