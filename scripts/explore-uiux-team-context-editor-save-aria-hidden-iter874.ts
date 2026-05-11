/**
 * Phase 6.15 loop iter 874 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * team-context-editor.tsx の 保存 Button visible text を aria-hidden span に統合。
 *
 * 課題: src/components/workspace/team-context-editor.tsx の line 113 「保存」 Button は
 *   visible {upd.isPending ? '保存中…' : '保存'} を直接 children として出していたが、
 *   aria-label が完全 content ('チームコンテキストに変更がないため保存不要' /
 *   'チームコンテキストを保存中…' / 'チームコンテキストを保存 (AI プロンプト末尾に inject)') を
 *   含むのに aria-hidden 無し → SR 再 announce。
 *   チームコンテキストは AI prompt 末尾 inject なので保存 path は AI 動作品質に直結、
 *   SR 文言摩擦は workflow 中断と相関。
 *
 * fix (1 ファイル 1 行差分):
 *   - 条件付き visible を <span aria-hidden="true">…</span> で wrap
 *
 * 検証: source-side regex assert + iter873/872/871/735 invariant cross-check。
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
      message: `team-context-editor 保存 Button aria-hidden 統合 OK (条件付き)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `team-context-editor 保存 未統合`,
    })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts (2 件)
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  // iter873 invariant: backlog-view 編集
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">編集<\/span>/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter873 invariant: backlog-view 編集 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter873 invariant: 破壊` })
  }

  // iter872 invariant
  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(iv)) {
    findings.push({
      level: 'info',
      message: `iter872 invariant: inbox-view 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter872 invariant: 破壊` })
  }

  // iter851 invariant
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: skip-link focus min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  console.log(`\n=== Findings (team-context-editor-save-aria-hidden-iter874) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
