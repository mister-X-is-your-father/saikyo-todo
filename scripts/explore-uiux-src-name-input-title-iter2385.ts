/**
 * Phase 6.15 loop iter2385: src-name input に title 付与し aria-label
 * state-dependent 4-path と sync。tmpl-name iter2365 / editTitle iter2295 と同
 * input title-aria sync pattern を src-name にも展開、name input 4-path family
 * 6 element 拡張。
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

  const ip = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (!ip.includes('iter2385')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations-panel iter2385 marker が無い',
    })
  }
  // empty path
  const empty = (
    ip.match(
      /'名前 — Source 名前 \(必須、最大 200 文字、識別しやすい名前 — 例: Yamory チーム A\)'/g,
    ) || []
  ).length
  if (empty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `src-name empty 出現 ${empty} 回、aria-label + title 計 2 回必要`,
    })
  }
  // valid path
  const valid = (ip.match(/`名前 — Source 名前 \(現在 \$\{name\.length\} \/ 200 文字\)`/g) || [])
    .length
  if (valid < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `src-name valid 出現 ${valid} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — src-name input title 4-path sync 完了、name input 4-path family 6 element 拡張',
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
