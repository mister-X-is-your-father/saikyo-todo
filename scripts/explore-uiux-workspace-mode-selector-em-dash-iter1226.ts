/**
 * Phase 6.15 loop iter1226: workspace-mode-selector radio button aria-label style
 * alignment regression guard (em-dash convention 統一)。
 *
 * iter1226 で発見した style divergence (visible-prefix sweep iter1093-1225 と):
 * workspace-mode-selector.tsx の radio button aria-label `${opt.label}: ${opt.description}` は
 * visible-prefix 自体は満たすが ": " 区切で iter1093+ sweep の em-dash " — " convention と
 * divergence。視覚 prefix 不変で voice control prefix-matching は変わらないが、codebase 全体の
 * aria-label 統一 (": " → " — ") で SR 読み上げ時の区切が一貫し、認識コスト下がる。
 *
 * 修正 (workspace-mode-selector.tsx):
 * `${opt.label} — ${opt.description}` で em-dash 区切に統一
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workspace-mode-selector-em-dash-iter1226.ts
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
  const filePath = resolve(here, '../src/components/workspace/workspace-mode-selector.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('aria-label={`${opt.label} — ${opt.description}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace-mode-selector aria-label 新形式 (em-dash) 欠落',
    })
  }

  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  if (activeCode.includes('aria-label={`${opt.label}: ${opt.description}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 colon 区切 aria-label が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — workspace-mode-selector aria-label は em-dash convention 統一済')
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
