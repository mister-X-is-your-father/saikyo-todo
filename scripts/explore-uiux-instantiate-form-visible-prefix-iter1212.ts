/**
 * Phase 6.15 loop iter1212: template/instantiate-form override + var input aria-label
 * visible-prefix regression guard。
 *
 * iter1212 で発見した visible-prefix 漏れ (subtasks-bulk iter1211 と同 sweep):
 * instantiate-form.tsx の Template 展開 form 2 種 form control:
 *
 * 1. `override-${template.id}` IMEInput empty-path `Template「${name}」展開時の root
 *    Item タイトル (...)` は visible Label "root Item タイトル (任意)" を中位置に持ち
 *    voice control prefix-matching「click root Item タイトル」 match 不可。
 *    (他 2 path は既に visible 冒頭で OK だったため empty-path のみ修正)
 *
 * 2. `var-${template.id}-${v}` IMEInput の旧 aria-label (全 4 path)
 *    `Mustache 変数「${v}」 (...)` は visible Label "変数: {v}" を中位置
 *    "**Mustache** 変数「${v}」 (...)" に持ち voice control prefix-matching「click 変数」
 *    match 不可。
 *
 * 修正 (instantiate-form.tsx):
 * - override-${id} empty-path: `root Item タイトル — Template「${name}」展開時の root Item タイトル (...)`
 * - var-${id}-${v}: 全 4 path とも `変数: ${v} — Mustache 変数「${v}」 (...)` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-instantiate-form-visible-prefix-iter1212.ts
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
  const filePath = resolve(here, '../src/components/template/instantiate-form.tsx')
  const src = readFileSync(filePath, 'utf8')

  // override-${id} empty-path 新
  if (
    !src.includes(
      '`root Item タイトル — Template「${template.name}」展開時の root Item タイトル (任意、最大 500 文字、省略時は「${template.name}」)`',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'override-${id} empty-path aria-label 新 path 欠落',
    })
  }

  // var-${id}-${v} 新 4 path
  const expectedVar = [
    '`変数: ${v} — Mustache 変数「${v}」 の値 (必須、最大 500 文字、template の {{${v}}} に展開時 substitute される)`',
    '`変数: ${v} — Mustache 変数「${v}」 (現在 ${val.length} / 500 文字、空白のみは不正)`',
    '`変数: ${v} — Mustache 変数「${v}」 (現在 ${val.length} / 500 文字、上限近接)`',
    '`変数: ${v} — Mustache 変数「${v}」 (現在 ${val.length} / 500 文字)`',
  ]
  for (const e of expectedVar) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `var-${'${id}-${v}'} aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  const oldForbidden = [
    '`Template「${template.name}」展開時の root Item タイトル (任意、最大 500 文字、省略時は「${template.name}」)`',
    '`Mustache 変数「${v}」 の値 (必須、最大 500 文字、template の {{${v}}} に展開時 substitute される)`',
    '`Mustache 変数「${v}」 (現在 ${val.length} / 500 文字、空白のみは不正)`',
    '`Mustache 変数「${v}」 (現在 ${val.length} / 500 文字、上限近接)`',
    '`Mustache 変数「${v}」 (現在 ${val.length} / 500 文字)`',
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
    console.log(
      '(なし) — instantiate-form override + var aria-label は visible 冒頭固定済 (合計 5 path)',
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
