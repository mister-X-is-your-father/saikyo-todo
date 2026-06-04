/**
 * Phase 6.15 loop iter2255: budget-edit-cancel / budget-save-btn の 2 button に
 * title 付与し aria-label と sync (budget-edit-btn iter2123 と pair の budget edit
 * form button family 完成、cancel + save 2 element)。
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

  const bp = readFileSync(resolve(here, '../src/components/workspace/budget-panel.tsx'), 'utf8')
  if (!bp.includes('iter2255')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'budget-panel iter2255 marker が無い',
    })
  }
  // budget-edit-cancel: aria-label + title 計 2 出現
  const cancelText = (bp.match(/キャンセル — AI 月次コスト上限の編集を破棄/g) || []).length
  if (cancelText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `budget-edit-cancel 出現 ${cancelText} 回、aria-label + title 計 2 回必要`,
    })
  }
  // budget-save-btn: aria-label + title 計 2 出現 (pending text)
  const savePending = (bp.match(/保存中… — AI 月次コスト上限を保存中/g) || []).length
  if (savePending < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `budget-save-btn pending 出現 ${savePending} 回、aria-label + title 計 2 回必要`,
    })
  }

  const dp = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!dp.includes('iter2253')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2253 proposals accept/reject title が消えている',
    })
  }

  const tp = readFileSync(resolve(here, '../src/components/workspace/tag-picker.tsx'), 'utf8')
  if (!tp.includes('iter2251')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2251 tag-picker PopoverContent title が消えている',
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
      '(なし) — budget-edit-cancel + budget-save-btn title sync 完了、budget edit form button family 完成',
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
