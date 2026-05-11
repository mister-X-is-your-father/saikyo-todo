/**
 * Phase 6.15 loop iter 858 (mode-D Desktop a11y) —
 * instantiate-form 即実行 (Instantiate) button:
 * WCAG 2.5.3 (Label in Name) 違反を修正 (ellipsis vocab 不揃い)。
 *
 * 課題: src/components/template/instantiate-form.tsx 内の Template 即実行
 *   submit button は visible "展開中..." (ASCII 3 dots ".") と aria-label
 *   "Template「name」を展開中…" (Unicode HORIZONTAL ELLIPSIS U+2026) で
 *   末尾 ellipsis 表現が不一致 → visible "展開中..." は aria-label の
 *   strict substring に **ならない** (= name に visible 含まれず WCAG 2.5.3
 *   失敗)。idle path "即実行 (Instantiate)" は substring OK だが pattern
 *   統一のため 同 wrap。
 *
 * fix (1 ファイル ~3 行差分):
 *   - visible 全 path (pending "展開中..." / idle "即実行 (Instantiate)") を
 *     <span aria-hidden="true"> で wrap、aria-label 単独経路に統一
 *     (iter844-857 同 pattern)。
 *   - aria-label の Template 名 / Instantiate 文脈は維持。
 *
 * 検証: source-side regex assert + iter735-857 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const inf = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )

  // 1. instantiate visible 全 path は aria-hidden span で wrap
  if (
    /<span aria-hidden="true">\s*\{mut\.isPending \? '展開中\.\.\.' : '即実行 \(Instantiate\)'\}\s*<\/span>/.test(
      inf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `instantiate-form visible aria-hidden 統合 OK (2 path)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `instantiate-form visible aria-hidden 未統合`,
    })
  }

  // 2. aria-label の Instantiate 文脈維持
  if (/`Template「\$\{template\.name\}」を即実行 \(Instantiate\)`/.test(inf)) {
    findings.push({
      level: 'info',
      message: `instantiate-form aria-label (Instantiate 文脈) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `instantiate-form aria-label 文脈破壊` })
  }

  // 3. pending aria-label 維持 (Unicode ellipsis 側)
  if (/`Template「\$\{template\.name\}」を展開中…`/.test(inf)) {
    findings.push({
      level: 'info',
      message: `instantiate-form pending aria-label 維持 OK (Unicode ellipsis)`,
    })
  } else {
    findings.push({ level: 'warning', message: `instantiate-form pending aria-label 破壊` })
  }

  // iter857 invariant: templates-empty-create visible aria-hidden
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `iter857 invariant: templates-empty-create visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter857 invariant 破壊` })
  }

  // iter856 invariant: wf-node-preset visible aria-hidden
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\+ \{preset\.type\}<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: wf-node-preset visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (instantiate-form-aria-hidden-iter858) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
