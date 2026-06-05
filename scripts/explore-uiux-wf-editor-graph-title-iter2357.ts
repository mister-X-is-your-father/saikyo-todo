/**
 * Phase 6.15 loop iter2357: wf-editor-graph textarea に title 付与し aria-label
 * state-dependent 3-path (空 / parse-error / 通常) と sync。editDescription
 * iter2297 / edit-item-dod iter2355 と同 textarea title-aria 3-path sync pattern
 * を workflow editor graph JSON 入力 form にも展開。
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
  if (!wf.includes('iter2357')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflows-panel iter2357 marker が無い',
    })
  }
  // empty path
  const empty = (
    wf.match(
      /'graph JSON \(workflow の node 定義を JSON で記述、上のプリセット button で skeleton 追加可\)'/g,
    ) || []
  ).length
  if (empty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `wf-editor-graph empty 出現 ${empty} 回、aria-label + title 計 2 回必要`,
    })
  }
  // valid path
  const valid = (
    wf.match(/`graph JSON \(現在 \$\{graphText\.length\} 文字、node 定義 JSON\)`/g) || []
  ).length
  if (valid < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `wf-editor-graph valid 出現 ${valid} 回、aria-label + title 計 2 回必要`,
    })
  }
  // parse-error path
  const parseErr = (
    wf.match(/`graph JSON \(現在 \$\{graphText\.length\} 文字、JSON parse error あり\)`/g) || []
  ).length
  if (parseErr < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `wf-editor-graph parse-error 出現 ${parseErr} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — wf-editor-graph textarea title 3-path sync 完了、workflow editor graph JSON 入力 form hint 補完',
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
