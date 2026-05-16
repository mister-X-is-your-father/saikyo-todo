/**
 * Phase 6.15 loop iter 863 (mode-D Desktop a11y) —
 * team-context-editor + taskchute-view + dashboard-view: 3 button visible text を
 * aria-hidden span で wrap (一括、3 file)。
 *
 * 課題: 3 component に visible-text-only の重複読み上げ箇所が 3 種残っていた:
 *   1. team-context-editor: 保存 button (チームコンテキスト保存)
 *      aria-label "チームコンテキストを保存 (AI プロンプト末尾に inject)"
 *   2. taskchute-view: item title button (各 row)
 *      aria-label `${item.title} を編集`
 *   3. dashboard-view: MUST title button (MUST 一覧 row)
 *      aria-label `MUST「${item.title}」を編集`
 *
 * fix (3 file ~3 spot):
 *   - 各 visible text を <span aria-hidden="true"> で wrap、aria-label 単独経路
 *   - 機能不変、視覚 layout 不変、shadcn 編集なし
 *   - iter800-862 sweep の続編
 *
 * 検証: source-side regex assert + iter735/861/862 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{upd\.isPending \? '保存中…' : '保存'\}<\/span>/.test(tce)) {
    findings.push({
      level: 'info',
      message: `team-context-editor 保存 button aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `team-context-editor 保存 button aria-hidden 未統合`,
    })
  }
  if (/aria-label=\{[\s\S]+?'チームコンテキストを保存 \(AI プロンプト末尾に inject\)'/.test(tce)) {
    findings.push({
      level: 'info',
      message: `team-context-editor 保存 aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `team-context-editor aria-label 破壊` })
  }

  const tcv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(tcv)) {
    findings.push({
      level: 'info',
      message: `taskchute-view item title button aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `taskchute-view item title button aria-hidden 未統合`,
    })
  }
  if (/aria-label=\{`\$\{item\.title\} を編集`\}/.test(tcv)) {
    findings.push({
      level: 'info',
      message: `taskchute-view aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `taskchute-view aria-label 破壊` })
  }

  const dv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )
  // MUST title button aria-hidden span
  if (
    /aria-label=\{`MUST「\$\{item\.title\}」を編集`\}\s*>\s*<span aria-hidden="true">\{item\.title\}<\/span>/.test(
      dv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `dashboard-view MUST title button aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `dashboard-view MUST title button aria-hidden 未統合`,
    })
  }

  // iter862 invariant: budget-panel 上限を変更 aria-hidden
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">上限を変更<\/span>/.test(bp)) {
    findings.push({
      level: 'info',
      message: `iter862 invariant: budget-panel 上限を変更 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter862 invariant: 破壊` })
  }

  // iter861 invariant: inbox-view EmptyState aria-hidden
  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(iv)) {
    findings.push({
      level: 'info',
      message: `iter861 invariant: inbox-view EmptyState aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter861 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (team-taskchute-dashboard-aria-hidden-iter863) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
