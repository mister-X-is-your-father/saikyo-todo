/**
 * Phase 6.15 loop iter2407: mock-top-nav logout form に title 付与し aria-label と sync
 * (home page logout form iter2395 と同 form landmark title sync pattern、auth flow
 * form-level title family 5 element 拡張)。
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

  const mn = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )
  if (!mn.includes('iter2407')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-top-nav iter2407 marker が無い',
    })
  }
  const ariaCount = (mn.match(/aria-label="ログアウト操作"/g) || []).length
  const titleCount = (mn.match(/title="ログアウト操作"/g) || []).length
  if (ariaCount < 1 || titleCount < 1) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `logout form aria=${ariaCount} title=${titleCount}、各 1 必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — mock-top-nav logout form title sync 完了、auth flow form-level title family 5 element 拡張',
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
