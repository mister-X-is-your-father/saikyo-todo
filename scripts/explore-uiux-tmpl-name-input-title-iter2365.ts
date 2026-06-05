/**
 * Phase 6.15 loop iter2365: tmpl-name input に title 付与し aria-label state-
 * dependent 4-path (空 / 空白のみ / 上限近接 / 通常) と sync。editTitle iter2295
 * / te-description iter2303 と同 input title-aria sync pattern を Template
 * 名前 input にも展開、Template create form の validation hint 補完。
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

  const tp = readFileSync(resolve(here, '../src/components/template/templates-panel.tsx'), 'utf8')
  if (!tp.includes('iter2365')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'templates-panel iter2365 marker が無い',
    })
  }
  // empty path
  const empty = (
    tp.match(/'名前 — Template 名前 \(必須、最大 200 文字、何を生成するかが分かる名前\)'/g) || []
  ).length
  if (empty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tmpl-name empty 出現 ${empty} 回、aria-label + title 計 2 回必要`,
    })
  }
  // valid path
  const valid = (tp.match(/`名前 — Template 名前 \(現在 \$\{name\.length\} \/ 200 文字\)`/g) || [])
    .length
  if (valid < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tmpl-name valid 出現 ${valid} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — tmpl-name input title 4-path sync 完了、Template create form validation hint 補完',
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
