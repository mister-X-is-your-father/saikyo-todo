/**
 * Phase 6.15 loop iter 871 (mode-D Desktop a11y) —
 * items-board empty-state quick-add focus button visible を aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/items-board.tsx 行 471-484 の board-empty-quick-add
 *   button は aria-label "クイック追加入力欄にフォーカス (q キーでも可)" が完全
 *   content を含むのに visible "クイック追加にフォーカス (キー: q)" は aria-hidden
 *   無し → SR 2 経路読み上げ重複。iter856 (inbox-view empty quick-add) と完全
 *   parallel な workspace 最初 EmptyState fix。iter844-870 と同 vocabulary。
 *
 * fix (1 ファイル +1/-1 行):
 *   - <span aria-hidden="true">クイック追加にフォーカス (キー: q)</span>
 *
 * 検証: source-side regex assert + iter856 / iter860 / iter870 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )

  if (
    /data-testid="board-empty-quick-add"[\s\S]*?<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(
      ib,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter871: board-empty-quick-add button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter871: board-empty-quick-add button aria-hidden 不完全`,
    })
  }

  // invariant: aria-label / data-testid / aria-keyshortcuts 維持
  if (
    /aria-label="クイック追加入力欄にフォーカス \(q キーでも可\)"/.test(ib) &&
    /data-testid="board-empty-quick-add"/.test(ib) &&
    /aria-keyshortcuts="q"/.test(ib)
  ) {
    findings.push({
      level: 'info',
      message: `iter871 invariant: board-empty-quick-add 属性維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter871 invariant: 破壊` })
  }

  // iter856 invariant: inbox-view empty quick-add
  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(iv)) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: inbox-view empty quick-add 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: 破壊` })
  }

  // iter870 invariant: backlog title + edit
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{String\(getValue\(\)\)\}<\/span>/.test(bv) &&
    /<span aria-hidden="true">編集<\/span>/.test(bv)
  ) {
    findings.push({
      level: 'info',
      message: `iter870 invariant: backlog title + edit 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter870 invariant: 破壊` })
  }

  console.log(`\n=== Findings (board-empty-quick-add-aria-hidden-iter871) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
