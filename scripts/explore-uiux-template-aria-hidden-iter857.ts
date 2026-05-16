/**
 * Phase 6.15 loop iter 857 (mode-D Desktop a11y) —
 * template family (instantiate-form / template-items-editor): Submit button +
 * 期日 offset chip 内 visible text を aria-hidden span で wrap (一括)。
 *
 * 課題: Template 関連 component 内に visible-text-only の重複読み上げ箇所が
 *   2 種類残っていた:
 *     1. instantiate-form: Submit button visible "展開中..." / "即実行 (Instantiate)"
 *        aria-label `Template「${name}」を即実行 (Instantiate)` で完全 content 含む
 *     2. template-items-editor: 期日 offset chip 内 visible "+{days}日"
 *        aria-label="期日 offset +{days} 日" が完全 content (= "期日 offset" prefix)
 *
 * fix (2 file ~2 spot):
 *   - 1: visible text を <span aria-hidden="true"> で wrap、aria-label 単独経路
 *   - 2: span (aria-label 持ち) の inner text を <span aria-hidden="true"> で
 *     wrap、aria-label 単独経路に統一
 *   両方とも 機能不変、視覚 layout 不変、shadcn 編集なし。
 *   iter800-856 sweep の続編 (template family に展開)。
 *
 * 検証: source-side regex assert + iter735/855/856 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. instantiate-form Submit button
  const inf = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{mut\.isPending \? '展開中\.\.\.' : '即実行 \(Instantiate\)'\}<\/span>/.test(
      inf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `instantiate-form Submit button visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `instantiate-form Submit button visible aria-hidden 未統合`,
    })
  }
  if (
    /aria-label=\{[\s\S]+?`Template「\$\{template\.name\}」を即実行 \(Instantiate\)`/.test(inf) &&
    /aria-label=\{[\s\S]+?`Template「\$\{template\.name\}」を展開中…`/.test(inf)
  ) {
    findings.push({
      level: 'info',
      message: `instantiate-form aria-label (active + pending) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `instantiate-form aria-label 破壊` })
  }

  // 2. template-items-editor 期日 offset chip
  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\+\{it\.dueOffsetDays\}日<\/span>/.test(tie)) {
    findings.push({
      level: 'info',
      message: `template-items-editor 期日 offset chip inner aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `template-items-editor 期日 offset chip inner aria-hidden 未統合`,
    })
  }
  if (/aria-label=\{`期日 offset \+\$\{it\.dueOffsetDays\} 日`\}/.test(tie)) {
    findings.push({
      level: 'info',
      message: `template-items-editor 期日 offset aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `template-items-editor 期日 offset aria-label 破壊`,
    })
  }

  // 3. iter835 invariant: template-items-editor + 追加 button aria-hidden 維持
  if (/<span aria-hidden="true">\+ 追加<\/span>/.test(tie)) {
    findings.push({
      level: 'info',
      message: `iter835 invariant: template-items-editor + 追加 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter835 invariant: 破壊` })
  }

  // iter856 invariant: mock-timesheet aria-hidden
  const tn = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">ログアウト<\/span>/.test(tn)) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: mock-top-nav ログアウト aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: 破壊` })
  }

  // iter855 invariant: integrations-panel visible aria-hidden
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">履歴<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter855 invariant: integrations-panel 履歴 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855 invariant: 破壊` })
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

  console.log(`\n=== Findings (template-aria-hidden-iter857) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
