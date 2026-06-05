/**
 * Phase 6.15 loop iter2395: home page logout form に title 付与し aria-label と sync
 * (proposal-edit-form iter2347 / Goal 作成 form iter2045 と同 form landmark title sync
 * pattern、auth flow form-level title family 拡張)。
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

  const pg = readFileSync(resolve(here, '../src/app/page.tsx'), 'utf8')
  if (!pg.includes('iter2395')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'home page iter2395 marker が無い',
    })
  }
  // aria-label + title 計 2 回出現
  const ariaCount = (pg.match(/aria-label="ログアウト"/g) || []).length
  const titleCount = (pg.match(/title="ログアウト"/g) || []).length
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
      '(なし) — home page logout form title sync 完了、auth flow form-level title family 拡張',
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
