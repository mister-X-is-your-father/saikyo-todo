/**
 * Phase 6.15 loop iter2363: estimate-bias-suggestions ul に title 付与し
 * aria-label "典型的な見積分の校正推奨 N 件 — calibration F× 適用" と sync。
 * KR list iter2329 / AI 分解提案 iter2331 / operation-board ul iter2357 と同
 * list family title pattern を time-entry 校正 widget にも展開。
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

  const eb = readFileSync(
    resolve(here, '../src/components/time-entry/estimate-bias-insight.tsx'),
    'utf8',
  )
  if (!eb.includes('iter2363')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'estimate-bias-insight iter2363 marker が無い',
    })
  }
  const expr = (
    eb.match(
      /`典型的な見積分の校正推奨 \$\{suggestions\.length\} 件 — calibration \$\{report\.calibrationFactor\.toFixed\(2\)\}× 適用`/g,
    ) || []
  ).length
  if (expr < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `estimate-bias suggestions ul expression 出現 ${expr} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — estimate-bias-suggestions ul title sync 完了、time-entry 校正 widget visual 文脈補完',
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
