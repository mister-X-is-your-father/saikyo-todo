/**
 * Phase 6.15 loop iter2367: template-items MUST checkbox に title 付与し
 * aria-label state-dependent 2-path (ON / OFF) と sync。proposal MUST iter2335
 * / edit-item-must iter2273 と同 MUST checkbox title pattern を template-items
 * にも展開、MUST checkbox 3 element family 完成 (item / proposal / template)。
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

  const ti = readFileSync(
    resolve(here, '../src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (!ti.includes('iter2367')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'template-items-editor iter2367 marker が無い',
    })
  }
  const on = (ti.match(/'MUST が ON: 絶対落とさない — DoD 必須、クリックで OFF'/g) || []).length
  if (on < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `template-items MUST on path 出現 ${on} 回、aria-label + title 計 2 回必要`,
    })
  }
  const off = (ti.match(/'MUST が OFF: 通常タスク — クリックで ON、DoD 必須化'/g) || []).length
  if (off < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `template-items MUST off path 出現 ${off} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — template-items MUST checkbox title 2-path sync 完了、MUST checkbox 3 element family 完成 (item / proposal / template)',
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
