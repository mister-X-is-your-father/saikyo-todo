/**
 * Phase 6.15 loop iter 963 (mode-M Mobile) — quick-add 入力 (IMEInput) に
 * `enterKeyHint="send"` を追加、Mobile keyboard の Enter button を「送信」に明示化。
 * iter949-962 enterKeyHint sweep 8 form 目、quick-add は Enter で submit する onKeyDown
 * を持つので "next" ではなく "send" 適用。
 *
 * 課題: quick-add IMEInput は aria-keyshortcuts="Enter" を持ち、onKeyDown で Enter
 *   submit するが enterKeyHint 未指定で Mobile keyboard が default 表示。「次へ」「送信」
 *   どちらか mobile user に判別不能。実 semantics は submit なので "send" を明示すれば
 *   user の confidence 向上。
 *
 * fix: quick-add.tsx の IMEInput に enterKeyHint="send" を追加。+1/-0 行 (1 file)。
 *   視覚 / aria-label / aria-keyshortcuts / 動作不変。Mobile keyboard が「送信」翻訳
 *   表示。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル 1 行。
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
  const target = 'src/components/workspace/quick-add.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. quick-add IMEInput に enterKeyHint="send"
  const inputCtx = src.slice(
    Math.max(0, src.indexOf('id="quick-add-input"') - 50),
    src.indexOf('id="quick-add-input"') + 1500,
  )
  if (!/enterKeyHint="send"/.test(inputCtx)) {
    findings.push({
      level: 'warning',
      message: `${target}: quick-add IMEInput に enterKeyHint="send" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `quick-add enterKeyHint="send" OK` })
  }

  // 2. aria-keyshortcuts="Enter" 維持 (regression 検出)
  if (!/aria-keyshortcuts="Enter"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: aria-keyshortcuts="Enter" 消滅 (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: `aria-keyshortcuts="Enter" 維持 OK` })
  }

  // 3. iter962 invariant: item-edit-dialog editTitle enterKeyHint="next"
  const itemEditSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  const titleCtx = itemEditSrc.slice(
    Math.max(0, itemEditSrc.indexOf('id="editTitle"') - 50),
    itemEditSrc.indexOf('id="editTitle"') + 600,
  )
  if (!/enterKeyHint="next"/.test(titleCtx)) {
    findings.push({ level: 'warning', message: `iter962 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter962 invariant OK` })
  }

  // 4. iter961 invariant: goals-panel enterKeyHint
  const goalsSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(goalsSrc)) {
    findings.push({ level: 'warning', message: `iter961 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter961 invariant OK` })
  }

  // 5. iter960 invariant: sprints-panel enterKeyHint
  const sprintsSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(sprintsSrc)) {
    findings.push({ level: 'warning', message: `iter960 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter960 invariant OK` })
  }

  // 6. iter735 invariant
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

  console.log(`\n=== Findings (quick-add-enter-key-hint-iter963) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
