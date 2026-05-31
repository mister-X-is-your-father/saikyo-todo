/**
 * Phase 6.15 loop iter1555: workflows-panel wf-run-toggle disclosure aria-label を
 * em-dash 形式に migration (iter1093-1554 sweep convention 着地)。
 *
 * 旧 aria-label `${triggerKind} 実行 (${time}) のノード詳細を{閉じる|表示}` は ' を' 助詞接続で
 * iter1093-1554 sweep の em-dash 区切と divergent。operation-board disclosure (iter1547) と
 * 同 pattern で em-dash 化。visible prefix `${triggerKind} 実行 (${time})` は維持。
 *
 * 修正 (workflows-panel.tsx):
 *   "${triggerKind} 実行 (${time}) のノード詳細を閉じる" → "${triggerKind} 実行 (${time}) — ノード詳細を閉じる"
 *   "${triggerKind} 実行 (${time}) のノード詳細を表示" → "${triggerKind} 実行 (${time}) — ノード詳細を表示"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workflow-run-toggle-em-dash-iter1555.ts
 * 前提: なし (source 直読 invariant)
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
  const src = readFileSync(resolve(here, '../src/components/workflow/workflows-panel.tsx'), 'utf8')

  if (!src.includes(') — ノード詳細を閉じる')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'wf-run-toggle aria-label (閉じる path) が em-dash 形式でない',
    })
  }
  if (!src.includes(') — ノード詳細を表示')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'wf-run-toggle aria-label (表示 path) が em-dash 形式でない',
    })
  }
  if (src.includes(') のノード詳細を閉じる')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'wf-run-toggle 旧 を-助詞接続 (閉じる) が残存',
    })
  }
  if (src.includes(') のノード詳細を表示')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'wf-run-toggle 旧 を-助詞接続 (表示) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — wf-run-toggle 両 path が em-dash 形式')
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
