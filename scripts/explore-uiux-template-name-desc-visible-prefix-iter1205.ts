/**
 * Phase 6.15 loop iter1205: templates-panel tmpl-name + tmpl-desc form control aria-label
 * visible-prefix regression guard。
 *
 * iter1205 で発見した visible-prefix 漏れ (src-name iter1204 / wf-name iter1203 と同 sweep):
 * templates-panel.tsx の Template 作成フォーム 2 件 form control:
 *
 * 1. `tmpl-name` IMEInput の旧 aria-label (全 4 path) `Template 名前 (...)` は visible
 *    Label "名前" を中位置 "Template **名前** (...)" に持ち voice control prefix-matching
 *    「click 名前」 match 不可。
 *
 * 2. `tmpl-desc` Textarea の旧 aria-label (全 2 path) `Template の説明 (...)` は visible
 *    Label "説明 (Cmd/Ctrl+Enter で作成)" を中位置 "Template の **説明** (...)" に持ち
 *    voice control prefix-matching「click 説明」 match 不可。
 *
 * 修正 (templates-panel.tsx):
 * - tmpl-name: 全 4 path とも `名前 — Template 名前 (...)` で先頭固定
 * - tmpl-desc: 全 2 path とも `説明 — Template の説明 (...)` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-template-name-desc-visible-prefix-iter1205.ts
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
  const filePath = resolve(here, '../src/components/template/templates-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expectedName = [
    "'名前 — Template 名前 (必須、最大 200 文字、何を生成するかが分かる名前)'",
    '`名前 — Template 名前 (現在 ${name.length} / 200 文字、空白のみは不正)`',
    '`名前 — Template 名前 (現在 ${name.length} / 200 文字、上限近接)`',
    '`名前 — Template 名前 (現在 ${name.length} / 200 文字)`',
  ]
  for (const e of expectedName) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `tmpl-name aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  const expectedDesc = [
    "'説明 — Template の説明 (任意、このテンプレートが何を生成するか、Cmd/Ctrl+Enter で作成)'",
    '`説明 — Template の説明 (現在 ${description.length} 文字、Cmd/Ctrl+Enter で作成)`',
  ]
  for (const e of expectedDesc) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `tmpl-desc aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  // 旧 prefix-less 形式が active code に残存していないこと (comment 除外)
  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  const oldForbidden = [
    "'Template 名前 (必須、最大 200 文字、何を生成するかが分かる名前)'",
    '`Template 名前 (現在 ${name.length} / 200 文字、空白のみは不正)`',
    '`Template 名前 (現在 ${name.length} / 200 文字、上限近接)`',
    '`Template 名前 (現在 ${name.length} / 200 文字)`',
    "'Template の説明 (任意、このテンプレートが何を生成するか、Cmd/Ctrl+Enter で作成)'",
    '`Template の説明 (現在 ${description.length} 文字、Cmd/Ctrl+Enter で作成)`',
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
    console.log('(なし) — tmpl-name + tmpl-desc aria-label は visible 冒頭固定済 (合計 6 path)')
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
