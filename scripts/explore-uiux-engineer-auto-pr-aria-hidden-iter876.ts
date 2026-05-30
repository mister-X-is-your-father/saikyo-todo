/**
 * Phase 6.15 loop iter 876 (mode-D Desktop a11y) —
 * engineer-trigger-button PR 自動起票 checkbox label visible text を
 * aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/engineer-trigger-button.tsx の PR 自動起票
 *   checkbox は aria-label が完全 content (visible "PR 自動起票" を含む +
 *   on/off 状態 + 動作説明) を持つのに、<label> 内の visible text は
 *   aria-hidden 無し → SR 重複読み上げ。
 *   iter873/874 の filter checkbox label と同 pattern。
 *
 * fix (1 file ~1 spot):
 *   - visible "PR 自動起票" を <span aria-hidden="true"> で wrap
 *   - aria-label 単独経路に統一、機能不変、視覚 layout 不変、shadcn 編集なし
 *
 * 検証: source-side regex assert + iter735/874/875 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const etb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  if (
    /<span className="text-muted-foreground" aria-hidden="true">\s*PR 自動起票\s*<\/span>/.test(etb)
  ) {
    findings.push({
      level: 'info',
      message: `engineer PR 自動起票 visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `engineer PR 自動起票 visible aria-hidden 未統合`,
    })
  }
  if (
    /aria-label=\{[\s\S]+?'PR 自動起票が ON: Engineer 起動時に Draft PR も作成される — クリックで OFF'/.test(
      etb,
    ) &&
    /aria-label=\{[\s\S]+?'PR 自動起票が OFF: Engineer 起動時は commit のみ、PR は人間が後で push — クリックで ON'/.test(
      etb,
    )
  ) {
    findings.push({
      level: 'info',
      message: `engineer PR 自動起票 aria-label (on/off 両 state) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `engineer PR 自動起票 aria-label 破壊`,
    })
  }
  if (/data-testid="engineer-auto-pr"/.test(etb)) {
    findings.push({
      level: 'info',
      message: `engineer-auto-pr data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `engineer-auto-pr data-testid 破壊` })
  }

  // iter874 invariant: gantt-view 2 toggle aria-hidden
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /<span aria-hidden="true">依存線<\/span>/.test(gv) &&
    /<span aria-hidden="true">完了済を隠す<\/span>/.test(gv)
  ) {
    findings.push({
      level: 'info',
      message: `iter874 invariant: gantt-view 2 toggle aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter874 invariant: 破壊` })
  }

  // iter873 invariant: items-board filter MUST aria-hidden
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">MUST のみ<\/span>/.test(ib)) {
    findings.push({
      level: 'info',
      message: `iter873 invariant: items-board filter MUST aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter873 invariant: 破壊` })
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

  console.log(`\n=== Findings (engineer-auto-pr-aria-hidden-iter876) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
