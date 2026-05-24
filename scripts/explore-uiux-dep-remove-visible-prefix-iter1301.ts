/**
 * Phase 6.15 loop iter1301: item-dependencies-panel.tsx dep-remove button aria-label visible-prefix +
 * voice control prefix-matching regression guard。
 *
 * iter1301 で発見した visible-prefix 違反: item-dependencies-panel.tsx `dep-remove-${ref.id}`
 * Button (依存 list の各行右端「解除」 button) の旧 aria-label `依存「${ref.title}」を解除[中…]`
 * は visible "解除" を末尾 "を**解除**" position に持ち、voice control prefix-matching
 * 「click 解除」 match 不可 (substring 一致のみ)。
 *
 * backlog-edit iter1152 / sprint-defaults-edit iter1153 と同 sweep convention で visible "解除"
 * 冒頭固定 + em-dash 区切で descriptive 末尾 (依存 title) 保持。
 *
 * 修正 (item-dependencies-panel.tsx):
 *   - 旧: `依存「${ref.title}」を解除中…` / `依存「${ref.title}」を解除`
 *   - 新: `解除 — 依存「${ref.title}」を解除中…` / `解除 — 依存「${ref.title}」を解除`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-dep-remove-visible-prefix-iter1301.ts
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
  const filePath = resolve(here, '../src/components/workspace/item-dependencies-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 新 template literal が存在することを確認 (両 path)
  if (!src.includes('`解除 — 依存「${ref.title}」を解除中…`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'dep-remove aria-label removing path が visible "解除" 冒頭固定 convention で無い',
    })
  }
  if (!src.includes('`解除 — 依存「${ref.title}」を解除`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'dep-remove aria-label default path が visible "解除" 冒頭固定 convention で無い',
    })
  }

  // 旧 template literal の active code 残存を確認 (comment 内の言及は除外)
  const codeOnly = src
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n')
  if (
    codeOnly.includes('removing ? `依存「${ref.title}」を解除中…` : `依存「${ref.title}」を解除`')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        '旧 aria-label `依存「title」を解除[中…]` (visible "解除" 末尾持ち、voice control prefix-match 不可) が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — dep-remove button aria-label は visible "解除" 冒頭固定 (voice control prefix-match satisfy)',
    )
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
