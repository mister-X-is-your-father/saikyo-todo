/**
 * Phase 6.15 loop iter2415: wf-editor cancel + save buttons pair に title 付与し
 * aria-label と sync (sprint-defaults cancel/save iter2363 / sprint-period cancel/save
 * iter2351 と同 pair button title pattern、Workflow editor dialog cancel/save 2 button
 * family 完成)。
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

  const wp = readFileSync(resolve(here, '../src/components/workflow/workflows-panel.tsx'), 'utf8')
  if (!wp.includes('iter2415')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflows-panel iter2415 marker が無い',
    })
  }
  const cancelText = (wp.match(/`キャンセル — Workflow「\$\{wf\.name\}」の編集を破棄`/g) || [])
    .length
  if (cancelText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `wf-editor-cancel 出現 ${cancelText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const savePending = (wp.match(/`保存中… — Workflow「\$\{wf\.name\}」の編集を保存中`/g) || [])
    .length
  if (savePending < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `wf-editor-save pending 出現 ${savePending} 回、aria-label + title 計 2 回必要`,
    })
  }
  const saveIdle = (
    wp.match(/`保存 — Workflow「\$\{wf\.name\}」の graph \/ trigger を保存`/g) || []
  ).length
  if (saveIdle < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `wf-editor-save idle 出現 ${saveIdle} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — wf-editor cancel + save buttons pair title sync 完了、Workflow editor dialog cancel/save 2 button family 完成',
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
