/**
 * Phase 6.15 loop iter 962 (mode-M Mobile) — item-edit-dialog の editTitle / editDescription
 * input に enterKeyHint="next" を追加。iter949-961 enterKeyHint sweep 7 form 目、
 * item 編集 dialog の text field 補完。
 *
 * 課題: item-edit-dialog の editTitle (タイトル) / editDescription (説明) は enterKeyHint
 *   未指定で、Mobile keyboard 上で「次の field へ進む」を表現できなかった。iter960
 *   sprints-panel / iter961 goals-panel と同 dialog 系 form pattern と不整合。
 *   editTitle → editDescription → editStart → editDue → editSprint (select) の form flow。
 *
 * fix: item-edit-dialog.tsx で
 *   1. editTitle (IMEInput) に enterKeyHint="next" (タイトル → 説明 へ)
 *   2. editDescription (IMEInput) に enterKeyHint="next" (説明 → 開始日 へ)
 *   開始日 / 期限 (date input) も次フィールドに進めるが date input の Enter は browser
 *   依存挙動 (modal の date picker や form submit) のため別 iter で慎重に検討。
 *   Sprint / KR は <select>、enterKeyHint 非適用。DoD textarea は Cmd/Ctrl+Enter handler
 *   なので enterKeyHint 非適用。
 *   +2/-0 行 (1 file)。視覚 / 動作不変。
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
  const target = 'src/components/workspace/item-edit-dialog.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  function checkInputContext(id: string, suffix: string): void {
    const idx = src.indexOf(`id="${id}"`)
    if (idx < 0) {
      findings.push({ level: 'error', message: `${target}: id="${id}" 不在` })
      return
    }
    const ctx = src.slice(Math.max(0, idx - 50), idx + 600)
    if (!new RegExp(`enterKeyHint="${suffix}"`).test(ctx)) {
      findings.push({
        level: 'warning',
        message: `${target}: ${id} 周辺に enterKeyHint="${suffix}" 不在`,
      })
    } else {
      findings.push({ level: 'info', message: `${id} enterKeyHint="${suffix}" OK` })
    }
  }

  checkInputContext('editTitle', 'next')
  checkInputContext('editDescription', 'next')

  // iter956 invariant: item-edit-dialog MUST checkbox label min-h-11 (本 file)
  if (
    !/<label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">[\s\S]{0,400}edit-item-must/.test(
      src,
    )
  ) {
    findings.push({ level: 'warning', message: `iter956 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter956 invariant OK` })
  }

  // iter961 invariant: goals-panel enterKeyHint
  const goalsSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(goalsSrc)) {
    findings.push({ level: 'warning', message: `iter961 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter961 invariant OK` })
  }

  // iter960 invariant: sprints-panel enterKeyHint
  const sprintsSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(sprintsSrc)) {
    findings.push({ level: 'warning', message: `iter960 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter960 invariant OK` })
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

  console.log(`\n=== Findings (item-edit-enter-key-hint-iter962) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
