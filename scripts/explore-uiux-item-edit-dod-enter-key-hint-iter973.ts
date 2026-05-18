/**
 * Phase 6.15 loop iter 973 (mode-M Mobile) — item-edit-dialog editDod IMEInput に
 * enterKeyHint="send" を追加。iter962/965 で title/desc/start/due 4 input に "next"
 * 適用済、本 iter で MUST 時表示の DoD 最終 input に "send" 追加 = item-edit-dialog
 * 全 5 IMEInput に enterKeyHint 完備。iter949-972 enterKeyHint sweep 18 form 目。
 *
 * 課題: item-edit-dialog の editDod IMEInput (MUST item 必須の完了条件入力) は
 *   enterKeyHint 未指定。MUST タスク作成時 user は DoD 入力後 Enter で form 保存を
 *   意図するが Mobile keyboard が default 表示で "送信" が示されない。
 *
 * fix: item-edit-dialog.tsx の editDod IMEInput に enterKeyHint="send" を追加。
 *   +1/-0 行 (1 file)。視覚 / 動作不変。Mobile keyboard "送信" 翻訳で DoD 確定後
 *   form save を明示。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex で codify、item-edit-dialog 全 5 input enterKeyHint 完備確認。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/workspace/item-edit-dialog.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  function checkInputContext(id: string, suffix: string): void {
    const idx = src.indexOf(`id="${id}"`)
    if (idx < 0) {
      findings.push({ level: 'error', message: `${target}: id="${id}" 不在` })
      return
    }
    const ctx = src.slice(Math.max(0, idx - 50), idx + 800)
    if (!new RegExp(`enterKeyHint="${suffix}"`).test(ctx)) {
      findings.push({
        level: 'warning',
        message: `${target}: ${id} に enterKeyHint="${suffix}" 不在`,
      })
    } else {
      findings.push({ level: 'info', message: `${id} enterKeyHint="${suffix}" OK` })
    }
  }

  // item-edit-dialog 全 5 input
  checkInputContext('editTitle', 'next')
  checkInputContext('editDescription', 'next')
  checkInputContext('editStart', 'next')
  checkInputContext('editDue', 'next')
  checkInputContext('editDod', 'send')

  // iter972 invariant: integrations-panel
  const integSrc = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(integSrc) || !/enterKeyHint="send"/.test(integSrc)) {
    findings.push({ level: 'warning', message: `iter972 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter972 invariant OK` })
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

  console.log(`\n=== Findings (item-edit-dod-enter-key-hint-iter973) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
