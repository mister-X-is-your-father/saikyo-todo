/**
 * Phase 6.15 loop iter2409: tmpl-kind select に title 付与し aria-label IIFE 2-path
 * と sync (src-kind iter2361 / dep-kind iter2373 / KR mode iter2371 / src-method iter2401
 * と同 select title-aria sync pattern、Template 種別選択基準 hover disclose)。
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
  if (!tp.includes('iter2409')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'templates-panel iter2409 marker が無い',
    })
  }
  const manualText = (tp.match(/'manual \(手動展開のみ、ユーザが「展開」 button で生成\)'/g) || [])
    .length
  if (manualText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tmpl-kind manual 出現 ${manualText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const recurringText = (tp.match(/'recurring \(cron 式に従って worker が自動展開\)'/g) || [])
    .length
  if (recurringText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tmpl-kind recurring 出現 ${recurringText} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — tmpl-kind select title 2-path sync 完了、Template 種別選択基準 (手動 vs 自動 + cron 要件) を hover で sighted disclose',
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
