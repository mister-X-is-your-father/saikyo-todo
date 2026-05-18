/**
 * Phase 6.15 loop iter 970 (mode-M Mobile) — instantiate-form (Template 展開 form) の
 * 2 IMEInput (root Item 名 override / Mustache 変数) に enterKeyHint="next" を追加。
 * iter949-969 enterKeyHint sweep 15 form 目、template 展開 form 補完。
 *
 * 課題: instantiate-form は override (root Item 名) + 各 Mustache 変数 (動的) で
 *   構成。Mobile keyboard で「次の field か submit か」 user 判別不能だった。
 *
 * fix: instantiate-form.tsx で
 *   1. override IMEInput に enterKeyHint="next" (root Item 名 → 変数 へ)
 *   2. 変数 IMEInput (動的、map で生成) に enterKeyHint="next"
 *      (最終変数 → 展開 submit は variable count 動的なので "next" 統一、
 *       browser focus 移動で submit Button に止まる)
 *   +2/-0 行 (1 file)。視覚 / 動作不変。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/template/instantiate-form.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. override IMEInput に enterKeyHint="next"
  const overrideCtx = src.slice(
    src.indexOf('id={`override-${template.id}`}'),
    src.indexOf('id={`override-${template.id}`}') + 800,
  )
  if (!/enterKeyHint="next"/.test(overrideCtx)) {
    findings.push({
      level: 'warning',
      message: `${target}: override IMEInput に enterKeyHint="next" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `override enterKeyHint="next" OK` })
  }

  // 2. var IMEInput に enterKeyHint="next"
  const varCtx = src.slice(
    src.indexOf('id={`var-${template.id}-${v}`}'),
    src.indexOf('id={`var-${template.id}-${v}`}') + 1500,
  )
  if (!/enterKeyHint="next"/.test(varCtx)) {
    findings.push({
      level: 'warning',
      message: `${target}: 変数 IMEInput に enterKeyHint="next" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `変数 enterKeyHint="next" OK` })
  }

  // iter969 invariant: templates-panel enterKeyHint
  const templatesSrc = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(templatesSrc) || !/enterKeyHint="send"/.test(templatesSrc)) {
    findings.push({ level: 'warning', message: `iter969 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter969 invariant OK` })
  }

  // iter935 invariant: instantiate-vars-empty p role/aria-live (本 file)
  if (
    !/data-testid={`instantiate-vars-empty-\${template\.id}`}[\s\S]{0,200}role="status"|role="status"[\s\S]{0,200}data-testid={`instantiate-vars-empty-/.test(
      src,
    )
  ) {
    findings.push({ level: 'warning', message: `iter935 invariant (empty p role/aria-live) 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter935 invariant OK` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({ level: 'info', message: `iter735 invariant OK (${tceMatches.length} 箇所)` })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant 破壊` })
  }

  console.log(`\n=== Findings (instantiate-form-enter-key-hint-iter970) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
