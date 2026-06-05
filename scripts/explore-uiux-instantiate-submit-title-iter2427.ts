/**
 * Phase 6.15 loop iter2427: instantiate submit button に title 付与し aria-label
 * state-dependent 2-path と sync (override iter2423 / var iter2425 と pair で instantiate
 * form の全 3 element (override + var + submit) 全 hover disclose 完備)。
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
  if (!ifrm.includes('iter2427')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'instantiate-form iter2427 marker が無い',
    })
  }
  const pendingText = (ifrm.match(/`展開中… — Template「\$\{template\.name\}」を即実行中`/g) || [])
    .length
  if (pendingText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `instantiate-submit pending 出現 ${pendingText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const idleText = (
    ifrm.match(
      /`即実行 \(Instantiate\) — Template「\$\{template\.name\}」をワークパッケージとして展開`/g,
    ) || []
  ).length
  if (idleText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `instantiate-submit idle 出現 ${idleText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2423 / iter2425 regression 検査
  if (!ifrm.includes('iter2423')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2423 override title が消えている',
    })
  }
  if (!ifrm.includes('iter2425')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2425 var title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — instantiate submit title 2-path sync 完了、instantiate form 3 element (override + var + submit) 全 hover disclose 完備',
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
