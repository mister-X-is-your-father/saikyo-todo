/**
 * Phase 6.15 loop iter1148: decompose-proposals-panel proposal edit button aria-label visible-prefix regression guard。
 *
 * iter1148 で発見した visible-prefix 漏れ: decompose-proposals-panel.tsx
 * `proposal-${id}-edit-btn` の旧 aria-label `提案「title」を編集${MUST?' (MUST)':''}` は
 * visible title を中位置 (位置 3 "提案「**title**」") に持ち voice control prefix-matching
 *「click {title}」 match 不可。iter1093-1147 sweep convention が漏れていた。
 *
 * 修正 (decompose-proposals-panel.tsx): visible title 冒頭固定 + em-dash 区切で descriptive 末尾
 *   - 新: `${title} — 提案を編集${MUST?' (MUST)':''}`
 *   - 旧: `提案「${title}」を編集${MUST?' (MUST)':''}`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-proposal-edit-btn-visible-prefix-iter1148.ts
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
  const filePath = resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('`${proposal.title} — 提案を編集${proposal.isMust ?')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'proposal edit button aria-label が visible-prefix 形式 "${title} — 提案を編集..." でない',
    })
  }
  if (src.includes('`提案「${proposal.title}」を編集${proposal.isMust ?')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 aria-label `提案「title」を編集` (visible 中位置) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — proposal edit button aria-label は visible title 冒頭固定済')
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
