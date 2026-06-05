/**
 * Phase 6.15 loop iter2379: subtasks-bulk-add-btn に title 付与し aria-label
 * state-dependent 3-path (empty / pending / ready) と sync (subtasks-panel button
 * family の hover disclose 強化、empty 時の guidance hint を sighted disclose)。
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
  if (!sp.includes('iter2379')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtasks-panel iter2379 marker が無い',
    })
  }
  // 3-path 各 text aria-label + title 計 2 回出現
  const emptyText = (sp.match(/'追加 — 子タスクを追加するには改行区切りで入力してください'/g) || [])
    .length
  if (emptyText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `subtasks-bulk-add empty 出現 ${emptyText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const pendingText = (sp.match(/`追加中… — 子タスク \$\{pendingTitleCount\} 件を追加中…`/g) || [])
    .length
  if (pendingText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `subtasks-bulk-add pending 出現 ${pendingText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const readyText = (
    sp.match(
      /`\$\{pendingTitleCount\} 件追加 — 子タスク \$\{pendingTitleCount\} 件をまとめて追加`/g,
    ) || []
  ).length
  if (readyText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `subtasks-bulk-add ready 出現 ${readyText} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — subtasks-bulk-add-btn title 3-path sync 完了、subtasks-panel button family の hover disclose 強化、empty 時 guidance hint も sighted disclose',
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
