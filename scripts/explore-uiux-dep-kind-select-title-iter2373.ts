/**
 * Phase 6.15 loop iter2373: dep-kind select に title 付与し aria-label IIFE 2-path
 * (prerequisite / related) と sync (KR mode iter2371 / sprint-defaults-dow iter2369 と同
 * select title-aria sync pattern、依存 setup form 選択基準 hover disclose 補完)。
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

  const idp = readFileSync(
    resolve(here, '../src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (!idp.includes('iter2373')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-dependencies-panel iter2373 marker が無い',
    })
  }
  // 2-path 各 visible text aria-label + title 計 2 回出現
  const prereqText = (
    idp.match(/'前提条件 \(上流、これが完了しないと本 Item を着手できない\)'/g) || []
  ).length
  if (prereqText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `dep-kind prerequisite 出現 ${prereqText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const relatedText = (idp.match(/'関連 \(緩い結び付き、進行ブロックではない\)'/g) || []).length
  if (relatedText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `dep-kind related 出現 ${relatedText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const returnText = (
    idp.match(/return `\$\{visible\} — 依存の種類 \(現在: \$\{visible\}\)`/g) || []
  ).length
  if (returnText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `dep-kind return text 出現 ${returnText} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — dep-kind select title 2-path sync 完了、依存 setup form 選択基準 hover disclose 補完、続く dep-target select は次 iter 候補',
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
