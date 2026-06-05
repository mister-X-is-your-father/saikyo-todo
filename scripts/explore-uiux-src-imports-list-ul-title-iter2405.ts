/**
 * Phase 6.15 loop iter2405: src-imports-list <ul> に title 付与し aria-label と sync
 * (Sprint 一覧 ul iter2193 / API 連携 source 一覧 ul iter2191 / KR 一覧 ul iter2329 と同
 * list family title pattern、Source 詳細 panel の Pull 履歴 hover disclose 補完)。
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
  if (!ip.includes('iter2405')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations-panel iter2405 marker が無い',
    })
  }
  // template aria-label + title 計 2 回出現
  const text = (ip.match(/`直近の Pull 履歴 \$\{imports\.length\} 件 — 最新順`/g) || []).length
  if (text < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `src-imports-list 出現 ${text} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — src-imports-list <ul> title sync 完了、list family title pattern 拡張、Source 詳細 panel の Pull 履歴 hover disclose 補完',
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
