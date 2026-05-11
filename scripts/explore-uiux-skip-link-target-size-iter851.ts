/**
 * Phase 6.15 loop iter 851 (mode-M Mobile a11y / WCAG 2.5.8 Target Size) —
 * skip-to-main link が focus 時 padding:0 で target size 不足。
 *
 * 課題: src/app/layout.tsx の skip link は className に `px-3 py-2` を含むが、
 *   `focus:not-sr-only` が padding:0 を reset するため focus 時の computed padding が 0px。
 *   結果: focus 時の click target が 186x20px = WCAG 2.5.8 (AAA Target Size 44x44)
 *   どころか Minimum Target Size (24x24) も下回る。
 *   keyboard user は Tab で focus → Enter で発火なので click target がボタンサイズ
 *   未満でも理論上動作するが、touch screen + keyboard 併用 (mobile bluetooth keyboard 等)
 *   では押せない event-handler 経路がある。
 *
 * fix (1 ファイル 1 行差分、focus: prefix で padding 復元 + min-h-11):
 *   - 旧: `... rounded px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-2 focus:left-2`
 *   - 新: `... rounded text-sm font-medium focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11 focus:items-center focus:px-3 focus:py-2`
 *
 * 検証: source-side regex assert + iter844/843/842/841/735 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11 focus:items-center focus:px-3 focus:py-2/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `skip-link focus state min-h-11 + px-3 + py-2 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `skip-link focus min-h-11 / padding 復元 未統合`,
    })
  }
  // 旧 always-on padding が残っていないこと
  if (/href="#main-content"[\s\S]{0,250}\srounded px-3 py-2 text-sm/.test(layout)) {
    findings.push({
      level: 'warning',
      message: `skip-link 旧 always-on px-3 py-2 が残存 (focus:not-sr-only で reset される)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `skip-link 旧 always-on px-3 py-2 削除 OK`,
    })
  }

  // iter844 invariant: login-form submit aria-hidden span
  const lf = readFileSync(resolve(process.cwd(), 'src/components/auth/login-form.tsx'), 'utf8')
  if (/<span aria-hidden="true">\{isPending \? 'ログイン中…' : 'ログイン'\}<\/span>/.test(lf)) {
    findings.push({
      level: 'info',
      message: `iter844 invariant: login-form submit aria-hidden span 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter844 invariant: 破壊` })
  }

  // iter843 invariant: item-edit-dialog reload button aria-hidden
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">最新を読み込み<\/span>/.test(ied)) {
    findings.push({
      level: 'info',
      message: `iter843 invariant: item-edit-dialog reload button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter843 invariant: 破壊` })
  }

  // iter841 invariant: items-board view-switcher
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">Today<\/span>/.test(ib) &&
    /<span aria-hidden="true">月次<\/span>/.test(ib)
  ) {
    findings.push({
      level: 'info',
      message: `iter841 invariant: items-board view-switcher aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter841 invariant: 破壊` })
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

  console.log(`\n=== Findings (skip-link-target-size-iter851) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
