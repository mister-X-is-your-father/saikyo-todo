/**
 * Phase 6.15 loop iter2423: instantiate override IMEInput に title 付与し aria-label
 * state-dependent 3-path と sync (tmpl-name iter2365 / tmpl-desc iter2411 と同 Template
 * form input title sync pattern、instantiate form の root Item タイトル override の hover
 * disclose 補完)。
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

  const ifrm = readFileSync(
    resolve(here, '../src/components/template/instantiate-form.tsx'),
    'utf8',
  )
  if (!ifrm.includes('iter2423')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'instantiate-form iter2423 marker が無い',
    })
  }
  // 3-path 各 text aria-label + title 計 2 回出現
  const emptyText = (
    ifrm.match(
      /`root Item タイトル — Template「\$\{template\.name\}」展開時の root Item タイトル \(任意、最大 500 文字、省略時は「\$\{template\.name\}」\)`/g,
    ) || []
  ).length
  if (emptyText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `override empty 出現 ${emptyText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const nearLimitText = (
    ifrm.match(/`root Item タイトル \(現在 \$\{override\.length\} \/ 500 文字、上限近接\)`/g) || []
  ).length
  if (nearLimitText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `override 上限近接 出現 ${nearLimitText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const normalText = (
    ifrm.match(/`root Item タイトル \(現在 \$\{override\.length\} \/ 500 文字\)`/g) || []
  ).length
  if (normalText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `override normal 出現 ${normalText} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — instantiate override IMEInput title 3-path sync 完了、Template form input title sync pattern 拡張',
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
