/**
 * Phase 6.15 loop iter2393: active-timer estimate chip に title 付与し aria-label と sync
 * (calibrated chip iter1851 と pair で active-timer 見積系 chip 2 element 全 hover disclose
 * 統一)。
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

  const atp = readFileSync(
    resolve(here, '../src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (!atp.includes('iter2393')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'active-timer-panel iter2393 marker が無い',
    })
  }
  // estimate chip aria-label + title 計 2 回出現
  const text = (atp.match(/`見積 \$\{estimateMinutes\}分`/g) || []).length
  if (text < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `estimate chip 出現 ${text} 回、aria-label + title 計 2 回必要`,
    })
  }

  // 既存 calibrated chip (iter1851) regression 検査
  if (!atp.includes('iter1851')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1851 calibrated chip title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — active-timer estimate chip title sync 完了、calibrated chip iter1851 と pair で active-timer 見積系 chip 2 element 全 hover disclose 統一',
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
