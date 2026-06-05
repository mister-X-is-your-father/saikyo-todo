/**
 * Phase 6.15 loop iter2363: sprint-defaults cancel + save buttons pair に title 付与し
 * aria-label と sync (sprint-period cancel/save iter2351 と pair の sprint-defaults
 * 同型 button pair、Sprint 設定 cancel/save button 2 pair = 4 button family 完成)。
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

  const sp = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')
  if (!sp.includes('iter2363')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprints-panel iter2363 marker が無い',
    })
  }
  // cancel button aria-label + title 計 2 回出現
  const cancelText = (sp.match(/"キャンセル — Sprint デフォルトの編集を破棄"/g) || []).length
  if (cancelText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `sprint-defaults-cancel 出現 ${cancelText} 回、aria-label + title 計 2 回必要`,
    })
  }
  // save button 2-path 各 text aria-label + title 計 2 回
  const savePending = (sp.match(/'保存中… — Sprint デフォルトを保存中'/g) || []).length
  if (savePending < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `sprint-defaults-save pending 出現 ${savePending} 回、aria-label + title 計 2 回必要`,
    })
  }
  const saveIdle = (sp.match(/'保存 — Sprint デフォルト \(基本曜日 \/ 期間\) を保存'/g) || [])
    .length
  if (saveIdle < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `sprint-defaults-save idle 出現 ${saveIdle} 回、aria-label + title 計 2 回必要`,
    })
  }

  // 既存 sprint-period cancel/save (iter2351) regression 検査
  if (!sp.includes('iter2351')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2351 sprint-period buttons title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — sprint-defaults cancel + save buttons title sync 完了、Sprint 設定 cancel/save button 2 pair (period + defaults) 4 button family 完成',
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
