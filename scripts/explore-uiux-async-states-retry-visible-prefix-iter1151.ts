/**
 * Phase 6.15 loop iter1151: async-states retry button aria-label visible-prefix regression guard。
 *
 * iter1151 で発見した visible-prefix 漏れ: async-states.tsx error state の retry button
 * (visible "再試行") の旧 aria-label `「message」をクリアして再試行` は visible "再試行"
 * を末尾に持ち voice control prefix-matching「click 再試行」 match 不可。
 * iter1093-1150 sweep convention が漏れていた。
 *
 * async-states は global error boundary 系で複数 view から呼ばれるため、ここ 1 件で
 * 影響範囲は広い (= 1 修正で複数画面の voice control が改善)。
 *
 * 修正 (async-states.tsx): visible "再試行" 冒頭固定 + em-dash 区切で error message 末尾保持
 *   - 新: `再試行 — 「${message}」をクリアして再試行`
 *   - 旧: `「${message}」をクリアして再試行`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-async-states-retry-visible-prefix-iter1151.ts
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
  const filePath = resolve(here, '../src/components/shared/async-states.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('`再試行 — 「${message}」をクリアして再試行`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'async-states retry button aria-label が visible-prefix 形式 "再試行 — ..." でない',
    })
  }
  if (src.includes('aria-label={`「${message}」をクリアして再試行`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 aria-label `「message」をクリアして再試行` (visible 末尾) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — async-states retry button aria-label は visible "再試行" 冒頭固定済')
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
