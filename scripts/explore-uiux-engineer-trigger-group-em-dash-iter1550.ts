/**
 * Phase 6.15 loop iter1550: engineer-trigger-button group landmark aria-label を
 * em-dash 形式に migration (iter1093-1549 sweep convention 着地)。
 *
 * 旧 aria-label `"「${title}」を Engineer Agent に投入 (PR 自動起票 toggle / 実装起動)"` は
 * ' を' 助詞接続で iter1093-1549 sweep の em-dash 区切と divergent。内部 button (line 97) は
 * 既に em-dash convention (`Engineer に実装させる — ...`) で、group landmark も convention 合わせる。
 *
 * 修正 (engineer-trigger-button.tsx):
 *   "「${title}」を Engineer Agent に投入 (...)" → "「${title}」 — Engineer Agent に投入 (...)"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-engineer-trigger-group-em-dash-iter1550.ts
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
    resolve(here, '../src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )

  if (!src.includes('「${item.title}」 — Engineer Agent に投入')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'engineer-trigger-button group aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('「${item.title}」を Engineer Agent に投入')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'engineer-trigger-button group の旧 を-助詞接続 aria-label 残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — engineer-trigger-button group aria-label が em-dash 形式')
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
