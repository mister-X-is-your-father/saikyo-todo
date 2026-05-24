/**
 * Phase 6.15 loop iter1215: integrations-panel src-delete + workflows-panel wf-delete
 * icon-only Trash2 button aria-label visible-prefix regression guard。
 *
 * iter1215 で発見した visible-prefix 漏れ (subtasks-indent iter1213 と同 sweep):
 * 2 file の icon-only Trash2 button:
 *
 * 1. integrations-panel.tsx `src-delete-${src.id}` 旧 aria-label 2 path
 *    `Source「${name}」を削除[中…]` は visible 概念名 "削除" を末尾に持ち voice control
 *    prefix-matching「click 削除」 match 不可 (icon-only Trash2、visible text 無)。
 *
 * 2. workflows-panel.tsx `wf-delete-${wf.id}` 旧 aria-label 2 path
 *    `Workflow「${name}」を削除[中…]` 同 pattern。
 *
 * 修正:
 * - src-delete: 2 path とも `削除[中…] — Source「name」を削除[中]` で先頭固定
 * - wf-delete: 2 path とも `削除[中…] — Workflow「name」を削除[中]` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-icon-delete-visible-prefix-iter1215.ts
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

  // src-delete (integrations-panel)
  const integrationsSrc = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const expectedSrc = [
    '`削除中… — Source「${src.name}」を削除中`',
    '`削除 — Source「${src.name}」を削除`',
  ]
  for (const e of expectedSrc) {
    if (!integrationsSrc.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `src-delete aria-label 新 path 欠落: ${e}`,
      })
    }
  }
  const integrationsActive = integrationsSrc
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  if (integrationsActive.includes('`Source「${src.name}」を削除中…`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 src-delete pending path が active code に残存',
    })
  }
  if (integrationsActive.includes('? `Source「${src.name}」を削除`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 src-delete default path が active code に残存',
    })
  }

  // wf-delete (workflows-panel)
  const workflowsSrc = readFileSync(
    resolve(here, '../src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  const expectedWf = [
    '`削除中… — Workflow「${wf.name}」を削除中`',
    '`削除 — Workflow「${wf.name}」を削除`',
  ]
  for (const e of expectedWf) {
    if (!workflowsSrc.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `wf-delete aria-label 新 path 欠落: ${e}`,
      })
    }
  }
  const workflowsActive = workflowsSrc
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  if (workflowsActive.includes('`Workflow「${wf.name}」を削除中…`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 wf-delete pending path が active code に残存',
    })
  }
  if (workflowsActive.includes('? `Workflow「${wf.name}」を削除`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 wf-delete default path が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — src-delete + wf-delete aria-label は visible 冒頭固定済 (合計 4 path、2 file)',
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
