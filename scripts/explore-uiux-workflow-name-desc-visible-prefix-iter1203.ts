/**
 * Phase 6.15 loop iter1203: workflows-panel wf-name + wf-desc form control aria-label
 * visible-prefix regression guard。
 *
 * iter1203 で発見した visible-prefix 漏れ (p-title iter1201 / p-desc iter1202 と同 sweep):
 * workflows-panel.tsx の Workflow 作成フォーム 2 件 form control:
 *
 * 1. `wf-name` IMEInput の旧 aria-label (全 4 path) `Workflow 名前 (...)` は visible
 *    Label "名前" を中位置 "Workflow **名前** (...)" に持ち voice control prefix-matching
 *    「click 名前」 match 不可。
 *
 * 2. `wf-desc` Textarea の旧 aria-label (全 3 path) `Workflow の説明 (...)` は visible
 *    Label "説明 (任意、Cmd/Ctrl+Enter で作成)" を中位置 "Workflow の **説明** (...)" に
 *    持ち voice control prefix-matching「click 説明」 match 不可。
 *
 * 修正 (workflows-panel.tsx):
 * - wf-name: 全 4 path とも `名前 — Workflow 名前 (...)` で先頭固定
 * - wf-desc: 全 3 path とも `説明 — Workflow の説明 (...)` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workflow-name-desc-visible-prefix-iter1203.ts
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
  const filePath = resolve(here, '../src/components/workflow/workflows-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expectedName = [
    "'名前 — Workflow 名前 (必須、最大 200 文字、何を自動化するか分かる名前)'",
    '`名前 — Workflow 名前 (現在 ${name.length} / 200 文字、空白のみは不正)`',
    '`名前 — Workflow 名前 (現在 ${name.length} / 200 文字、上限近接)`',
    '`名前 — Workflow 名前 (現在 ${name.length} / 200 文字)`',
  ]
  for (const e of expectedName) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `wf-name aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  const expectedDesc = [
    "'説明 — Workflow の説明 (任意、最大 2000 文字、Cmd/Ctrl+Enter で作成)'",
    '`説明 — Workflow の説明 (現在 ${description.length} / 2000 文字、上限近接、Cmd/Ctrl+Enter で作成)`',
    '`説明 — Workflow の説明 (現在 ${description.length} / 2000 文字、Cmd/Ctrl+Enter で作成)`',
  ]
  for (const e of expectedDesc) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `wf-desc aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  // 旧 prefix-less 形式が active code に残存していないこと (comment 除外)
  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  const oldForbidden = [
    "'Workflow 名前 (必須、最大 200 文字、何を自動化するか分かる名前)'",
    '`Workflow 名前 (現在 ${name.length} / 200 文字、空白のみは不正)`',
    '`Workflow 名前 (現在 ${name.length} / 200 文字、上限近接)`',
    '`Workflow 名前 (現在 ${name.length} / 200 文字)`',
    "'Workflow の説明 (任意、最大 2000 文字、Cmd/Ctrl+Enter で作成)'",
    '`Workflow の説明 (現在 ${description.length} / 2000 文字、上限近接、Cmd/Ctrl+Enter で作成)`',
    '`Workflow の説明 (現在 ${description.length} / 2000 文字、Cmd/Ctrl+Enter で作成)`',
  ]
  for (const o of oldForbidden) {
    if (activeCode.includes(o)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 prefix-less aria-label が active code に残存: ${o}`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — wf-name + wf-desc aria-label は visible 冒頭固定済 (合計 7 path)')
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
