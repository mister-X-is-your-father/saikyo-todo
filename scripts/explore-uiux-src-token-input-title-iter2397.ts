/**
 * Phase 6.15 loop iter2397: src-token IMEInput に title 付与し aria-label
 * state-dependent 2-path と sync (src-url iter2313 / src-name iter2385 と同
 * integrations input title-aria sync pattern、Yamory connector form の hover
 * disclose 拡張)。
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
  if (!ip.includes('iter2397')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations-panel iter2397 marker が無い',
    })
  }
  // empty path text aria-label + title 計 2 回出現
  const emptyText = (
    ip.match(/'API Token \(必須、Yamory API の secret token、type=password で入力中も非表示\)'/g) ||
    []
  ).length
  if (emptyText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `src-token empty 出現 ${emptyText} 回、aria-label + title 計 2 回必要`,
    })
  }
  // valued path template aria-label + title 計 2 回出現
  const valuedText = (
    ip.match(
      /`API Token \(現在 \$\{token\.length\} 文字、type=password で内容は SR にも非表示\)`/g,
    ) || []
  ).length
  if (valuedText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `src-token valued 出現 ${valuedText} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — src-token IMEInput title 2-path sync 完了、Yamory connector form の hover disclose 拡張、続く project IDs / 各 path input は次 iter 候補',
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
