/**
 * Phase 6.15 loop iter2235: team-context save button に title 付与し aria-label
 * state-dependent 3-path と sync (save 系 button family の team-context 1 element 補完)。
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
  if (
    !tce.includes('iter2235') ||
    !tce.includes('保存 — チームコンテキストに変更がないため保存不要') ||
    !tce.includes('保存中… — チームコンテキストを保存中…') ||
    !tce.includes('保存 — チームコンテキストを保存 (AI プロンプト末尾に inject)')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'team-context save button title が aria-label 3-path と sync されていない',
    })
  }
  // aria-label + title 計 2 出現
  const okText = (tce.match(/保存 — チームコンテキストに変更がないため保存不要/g) || []).length
  if (okText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `'保存不要' 出現が ${okText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const fqab = readFileSync(
    resolve(here, '../src/components/workspace/focus-quick-add-button.tsx'),
    'utf8',
  )
  if (!fqab.includes('iter2233')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2233 FocusQuickAddButton title が消えている',
    })
  }

  const rb = readFileSync(
    resolve(here, '../src/components/workspace/item-research-button.tsx'),
    'utf8',
  )
  if (!rb.includes('iter2231')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2231 item-research-button title が消えている',
    })
  }

  const mustBadge = readFileSync(
    resolve(here, '../src/components/workspace/must-badge.tsx'),
    'utf8',
  )
  if (!mustBadge.includes('title="MUST タスク"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1843 MustBadge title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — team-context save button title 3-path sync 完了、save 系 button family 補完',
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
