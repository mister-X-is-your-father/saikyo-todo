/**
 * Phase 6.15 loop iter1566: integrations-panel Pull error alert aria-label を
 * visible 冒頭 em-dash 形式に migration (iter1093-1565 sweep convention 着地)。
 *
 * 旧 aria-label `"Pull エラー: ${r.error}"` は ':' colon 区切で visible "${r.error}"
 * (= 隣接 aria-hidden span text) を末尾に持ち voice control prefix-matching 不可。
 * iter1553-1565 sweep convention で visible 冒頭固定 + em-dash 区切。
 *
 * 修正 (integrations-panel.tsx):
 *   "Pull エラー: ${r.error}" → "${r.error} — Pull エラー"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-integrations-pull-error-em-dash-iter1566.ts
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
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label={`${r.error} — Pull エラー`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations-panel Pull エラー aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('aria-label={`Pull エラー: ${r.error}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations-panel Pull エラー 旧 colon 形式 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — integrations-panel Pull エラー aria-label が em-dash 形式')
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
