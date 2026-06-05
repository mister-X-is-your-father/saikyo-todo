/**
 * Phase 6.15 loop iter2351: sprint-period-cancel / save buttons に title 付与し
 * aria-label と sync。sprint-retro iter2093 / sprint-premortem iter2095 と同
 * sprint button title pattern を period 編集 form 2 button family にも展開。
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
  if (!sp.includes('iter2351')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprints-panel iter2351 marker が無い',
    })
  }
  // cancel aria + title 計 2 出現
  const cancel = (sp.match(/`キャンセル — Sprint「\$\{sprint\.name\}」の期間編集を破棄`/g) || [])
    .length
  if (cancel < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `sprint-period-cancel 出現 ${cancel} 回、aria-label + title 計 2 回必要`,
    })
  }
  // save pending path
  const savePending = (sp.match(/`保存中… — Sprint「\$\{sprint\.name\}」の期間を保存中`/g) || [])
    .length
  if (savePending < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `sprint-period-save pending 出現 ${savePending} 回、aria-label + title 計 2 回必要`,
    })
  }
  // save idle path
  const saveIdle = (sp.match(/`保存 — Sprint「\$\{sprint\.name\}」の期間を保存`/g) || []).length
  if (saveIdle < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `sprint-period-save idle 出現 ${saveIdle} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — sprint-period-cancel / save title sync 完了、Sprint 期間編集 form 2 button family 完成',
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
