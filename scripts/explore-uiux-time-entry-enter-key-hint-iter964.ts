/**
 * Phase 6.15 loop iter 964 (mode-M Mobile) — create-time-entry-form の 3 input
 * (teDate / teDescription / teMinutes) に enterKeyHint="next"/"next"/"send" を追加。
 * iter949-963 enterKeyHint sweep 9 form 目、time entry 作成 form 補完。
 *
 * 課題: create-time-entry-form は 3 input (date / description / minutes) + 1 select
 *   (category) を持つが enterKeyHint 未指定で Mobile keyboard の Enter button が default
 *   表示。「次の field か form submit か」 user 判別不能。
 *
 * fix: create-time-entry-form.tsx で
 *   1. teDate (IMEInput type=date) に enterKeyHint="next" (日付 → category select へ)
 *   2. teDescription (IMEInput) に enterKeyHint="next" (作業内容 → 分 へ)
 *   3. teMinutes (IMEInput type=number) に enterKeyHint="send" (分 → form 送信)
 *   teCategory は <select>、enterKeyHint 非適用。
 *   +3/-0 行 (1 file)。視覚 / 動作不変。Mobile keyboard "次へ" / "送信" 翻訳で 4 field
 *   form の入力 flow 明示。
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
  const target = 'src/components/time-entry/create-time-entry-form.tsx'
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
        message: `${target}: ${id} 周辺に enterKeyHint="${suffix}" 不在`,
      })
    } else {
      findings.push({ level: 'info', message: `${id} enterKeyHint="${suffix}" OK` })
    }
  }

  checkInputContext('teDate', 'next')
  checkInputContext('teDescription', 'next')
  checkInputContext('teMinutes', 'send')

  // iter963 invariant: quick-add enterKeyHint
  const quickAddSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="send"/.test(quickAddSrc)) {
    findings.push({ level: 'warning', message: `iter963 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter963 invariant OK` })
  }

  // iter962 invariant
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

  console.log(`\n=== Findings (time-entry-enter-key-hint-iter964) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
