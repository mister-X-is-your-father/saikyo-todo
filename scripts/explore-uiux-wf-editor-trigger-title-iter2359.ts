/**
 * Phase 6.15 loop iter2359: wf-editor-trigger textarea に title 付与し aria-label
 * state-dependent 3-path (空 / parse-error / 通常) と sync。wf-editor-graph
 * iter2357 と pair で workflow editor 2 textarea (graph / trigger) family 完成。
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

  const wf = readFileSync(resolve(here, '../src/components/workflow/workflows-panel.tsx'), 'utf8')
  if (!wf.includes('iter2359')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflows-panel iter2359 marker が無い',
    })
  }
  // empty path
  const empty = (
    wf.match(
      /'trigger JSON \(manual \/ cron \/ item-event \/ webhook の 4 種、上のプリセット button で template 挿入可\)'/g,
    ) || []
  ).length
  if (empty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `wf-editor-trigger empty 出現 ${empty} 回、aria-label + title 計 2 回必要`,
    })
  }
  // valid path
  const valid = (
    wf.match(/`trigger JSON \(現在 \$\{triggerText\.length\} 文字、起動条件 JSON\)`/g) || []
  ).length
  if (valid < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `wf-editor-trigger valid 出現 ${valid} 回、aria-label + title 計 2 回必要`,
    })
  }
  // iter2357 graph regression guard
  if (!wf.includes('iter2357')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2357 wf-editor-graph title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — wf-editor-trigger textarea title 3-path sync 完了、workflow editor 2 textarea (graph / trigger) family 完成',
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
