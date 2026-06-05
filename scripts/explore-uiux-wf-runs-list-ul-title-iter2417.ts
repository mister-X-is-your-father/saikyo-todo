/**
 * Phase 6.15 loop iter2417: wf-runs-list <ul> に title 付与し aria-label と sync
 * (src-imports-list iter2405 と同 history list family title pattern、Workflow 詳細 panel
 * 実行履歴 hover disclose 補完)。
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
  if (!wp.includes('iter2417')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflows-panel iter2417 marker が無い',
    })
  }
  const text = (wp.match(/`直近の実行履歴 \$\{runs\.length\} 件 — 最新順`/g) || []).length
  if (text < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `wf-runs-list 出現 ${text} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2415 wf-editor buttons regression 検査
  if (!wp.includes('iter2415')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2415 wf-editor buttons title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — wf-runs-list <ul> title sync 完了、src-imports + wf-runs で history list family pattern 2 element 完成',
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
