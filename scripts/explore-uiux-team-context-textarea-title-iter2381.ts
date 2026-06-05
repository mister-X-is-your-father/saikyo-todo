/**
 * Phase 6.15 loop iter2381: team-context-textarea に title 付与し aria-label
 * state-dependent 3-path と sync (editDescription iter2297 / edit-item-dod iter2355 /
 * wf-editor-graph iter2357 と同 textarea title-aria sync pattern、5 textarea title family 拡張)。
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

  const tce = readFileSync(
    resolve(here, '../src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  if (!tce.includes('iter2381')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'team-context-editor iter2381 marker が無い',
    })
  }
  // 3-path 各 text aria-label + title 計 2 回出現
  const emptyText = (
    tce.match(
      /'チームコンテキスト \(workspace 全体、最大 4000 文字、AI プロンプト末尾に inject、Cmd\/Ctrl\+Enter で保存\)'/g,
    ) || []
  ).length
  if (emptyText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `team-context empty 出現 ${emptyText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const nearLimitText = (
    tce.match(
      /`チームコンテキスト \(現在 \$\{draft\.length\} \/ 4000 文字、上限近接、Cmd\/Ctrl\+Enter で保存\)`/g,
    ) || []
  ).length
  if (nearLimitText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `team-context 上限近接 出現 ${nearLimitText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const normalText = (
    tce.match(
      /`チームコンテキスト \(現在 \$\{draft\.length\} \/ 4000 文字、Cmd\/Ctrl\+Enter で保存\)`/g,
    ) || []
  ).length
  if (normalText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `team-context normal 出現 ${normalText} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — team-context-textarea title 3-path sync 完了、5 textarea title family 拡張 (editDescription / edit-item-dod / wf-editor-graph / wf-editor-trigger / team-context)',
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
