/**
 * Phase 6.15 loop iter2441: wf-node-run-error <pre> + wf-node-run-output <summary> に
 * title 付与し aria-label と sync (src-import error iter2437 + wf-run-toggle iter2431 と同
 * error/disclosure title pattern を node 別にも展開、Workflow node 別 chip family 拡張)。
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
  if (!wp.includes('iter2441')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflows-panel iter2441 marker が無い',
    })
  }
  const errText = (wp.match(/`node \$\{nr\.nodeId\} のエラー`/g) || []).length
  if (errText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `wf-node-run-error 出現 ${errText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const outText = (wp.match(/`output \(jsonb\) — node \$\{nr\.nodeId\} の出力を開閉`/g) || [])
    .length
  if (outText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `wf-node-run-output 出現 ${outText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2439 wf-node-runs ul regression 検査
  if (!wp.includes('iter2439')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2439 wf-node-runs <ul> title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — wf-node-run-error + wf-node-run-output title sync 完了、Workflow node 別 chip family 拡張',
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
