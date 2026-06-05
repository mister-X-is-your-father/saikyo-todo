/**
 * Phase 6.15 loop iter2401: src-method select に title 付与し aria-label IIFE 2-path
 * と sync (src-kind iter2361 / dep-kind iter2373 / KR mode iter2371 と同 select
 * title-aria sync pattern、REST source method 選択基準 hover disclose)。
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
  if (!ip.includes('iter2401')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations-panel iter2401 marker が無い',
    })
  }
  // 2-path 各 text aria-label + title 計 2 回出現
  const getText = (ip.match(/'GET — 副作用なし、URL の query で読取り'/g) || []).length
  if (getText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `src-method GET 出現 ${getText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const postText = (ip.match(/'POST — body 付き送信、subscribe \/ search 系の API に使う'/g) || [])
    .length
  if (postText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `src-method POST 出現 ${postText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const returnText = (
    ip.match(/return `\$\{visible\} — HTTP メソッド \(現在: \$\{visible\}\)`/g) || []
  ).length
  if (returnText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `src-method return text 出現 ${returnText} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — src-method select title 2-path sync 完了、REST source method 選択基準 (副作用 / body 必要性) を hover で sighted disclose',
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
