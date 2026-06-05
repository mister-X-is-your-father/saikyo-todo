/**
 * Phase 6.15 loop iter2389: subtasks-bulk textarea に title 付与し aria-label
 * state-dependent 3-path と sync (subtasks-bulk-add-btn iter2379 と pair で
 * subtasks-bulk-add form の input + button 全 hover disclose 完備)。
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

  const sp = readFileSync(resolve(here, '../src/components/workspace/subtasks-panel.tsx'), 'utf8')
  if (!sp.includes('iter2389')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtasks-panel iter2389 marker が無い',
    })
  }
  // 3-path 各 text aria-label + title 計 2 回出現
  const emptyText = (
    sp.match(
      /'改行区切りで bulk 追加 — 子タスクを改行区切りで bulk 追加 \(Cmd\/Ctrl\+Enter で追加\)'/g,
    ) || []
  ).length
  if (emptyText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `subtasks-bulk empty 出現 ${emptyText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const blankOnlyText = (
    sp.match(
      /'改行区切りで bulk 追加 — 子タスクを改行区切りで bulk 追加 \(現在 空行のみで追加対象なし\)'/g,
    ) || []
  ).length
  if (blankOnlyText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `subtasks-bulk 空行のみ 出現 ${blankOnlyText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const pendingCountText = (
    sp.match(
      /`改行区切りで bulk 追加 — 子タスクを改行区切りで bulk 追加 \(現在 \$\{pendingTitleCount\} 件、Cmd\/Ctrl\+Enter で追加\)`/g,
    ) || []
  ).length
  if (pendingCountText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `subtasks-bulk pending count 出現 ${pendingCountText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2379 bulk-add-btn regression 検査
  if (!sp.includes('iter2379')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2379 subtasks-bulk-add-btn title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — subtasks-bulk textarea title 3-path sync 完了、subtasks-bulk-add form の input + button 全 hover disclose 完備',
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
