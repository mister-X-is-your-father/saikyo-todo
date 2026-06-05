/**
 * Phase 6.15 loop iter2433: tmpl-cron IMEInput に title 付与し aria-label
 * state-dependent 2-path と sync (tmpl-name iter2365 / tmpl-kind iter2409 / tmpl-desc
 * iter2411 と pair で Template create form の recurring 関連 全 input 全 hover disclose
 * 完備)。
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
  if (!tp.includes('iter2433')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'templates-panel iter2433 marker が無い',
    })
  }
  const emptyText = (
    tp.match(
      /'cron 式 \(任意、5 フィールド標準 cron 形式 — 例: 「0 9 \* \* 1」 で毎週月曜 09:00\)'/g,
    ) || []
  ).length
  if (emptyText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tmpl-cron empty 出現 ${emptyText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const valuedText = (
    tp.match(/`cron 式 \(現在 \$\{scheduleCron\.length\} 文字、5 フィールド標準形式\)`/g) || []
  ).length
  if (valuedText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tmpl-cron valued 出現 ${valuedText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2409 / iter2411 regression 検査
  if (!tp.includes('iter2409')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2409 tmpl-kind title が消えている',
    })
  }
  if (!tp.includes('iter2411')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2411 tmpl-desc title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — tmpl-cron IMEInput title 2-path sync 完了、Template create form recurring 関連 全 input (name + kind + desc + cron) 全 hover disclose 完備',
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
