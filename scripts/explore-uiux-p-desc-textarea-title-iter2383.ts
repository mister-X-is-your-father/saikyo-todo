/**
 * Phase 6.15 loop iter2383: p-desc (decompose-proposals 編集 form の Textarea) に
 * title 付与し aria-label 3-path と sync (team-context iter2381 / editDescription iter2297 /
 * edit-item-dod iter2355 / wf-editor-graph iter2357 / wf-editor-trigger iter2359 と同
 * textarea title-aria sync pattern、6 textarea title family 拡張、proposal-title input
 * iter2371 と pair の提案編集 form 全 hover disclose 完備)。
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

  const dpp = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!dpp.includes('iter2383')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'decompose-proposals-panel iter2383 marker が無い',
    })
  }
  // 3-path 各 text aria-label + title 計 2 回出現
  const emptyText = (
    dpp.match(
      /'説明 — 提案 description \(任意、最大 10000 文字、Markdown 可、Cmd\/Ctrl\+Enter で保存\)'/g,
    ) || []
  ).length
  if (emptyText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `p-desc empty 出現 ${emptyText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const nearLimitText = (
    dpp.match(
      /`説明 — 提案 description \(現在 \$\{description\.length\} \/ 10000 文字、上限近接、Cmd\/Ctrl\+Enter で保存\)`/g,
    ) || []
  ).length
  if (nearLimitText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `p-desc 上限近接 出現 ${nearLimitText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const normalText = (
    dpp.match(
      /`説明 — 提案 description \(現在 \$\{description\.length\} \/ 10000 文字、Cmd\/Ctrl\+Enter で保存\)`/g,
    ) || []
  ).length
  if (normalText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `p-desc normal 出現 ${normalText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // proposal-title iter2371 / proposal-MUST iter2335 regression 検査
  if (!dpp.includes('iter2371')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2371 proposal-title input title が消えている',
    })
  }
  if (!dpp.includes('iter2335')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2335 proposal MUST checkbox title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — p-desc Textarea title 3-path sync 完了、6 textarea title family 拡張、提案編集 form (title input + desc Textarea + MUST checkbox) 全 hover disclose 完備',
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
