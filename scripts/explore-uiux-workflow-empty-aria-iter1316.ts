/**
 * Phase 6.15 loop iter1316: workflow-graph-canvas.tsx 空 graph EmptyState の
 * aria-label / visible text divergence 修正 regression guard。
 *
 * iter1316 で発見: workflow-graph-canvas.tsx の `graph.nodes.length === 0` branch は
 * `role="status" aria-label="Workflow graph は空です"` を付けていたが、inner visible text
 * "node が無いため graph は表示できません。下の JSON で node を追加してください。" と
 * 完全 divergence。aria-label が優先され SR は短い "Workflow graph は空です" のみ読み、
 * 詳細メッセージ ("下の JSON で node を追加" 次 action 指示) が SR user に伝わらない。
 *
 * 修正 (workflow-graph-canvas.tsx):
 *   - aria-label を撤回し inner text を accessible name に
 *   - SR + visible が同じ「empty + 次 action」 を共有
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workflow-empty-aria-iter1316.ts
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
  const filePath = resolve(here, '../src/components/workflow/workflow-graph-canvas.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 旧 aria-label の active code 残存を確認 (comment 内の言及は除外)
  const codeOnly = src
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n')
  if (codeOnly.includes('aria-label="Workflow graph は空です"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        '旧 aria-label "Workflow graph は空です" (visible inner text と divergence) が active code に残存',
    })
  }

  // 新コードに inner visible text が残ってる確認
  if (
    !src.includes('node が無いため graph は表示できません。下の JSON で node を追加してください。')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'visible inner text "node が無いため..." が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — workflow-graph-canvas 空 graph EmptyState は aria-label 撤回で SR + visible 整合',
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
