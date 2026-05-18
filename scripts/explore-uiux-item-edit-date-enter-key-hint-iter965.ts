/**
 * Phase 6.15 loop iter 965 (mode-M Mobile) — item-edit-dialog editStart / editDue
 * date input に enterKeyHint="next" を追加。iter962 で editTitle/editDescription に
 * 適用した sweep を date input にも完備、iter949-964 enterKeyHint sweep 10 form 目
 * (item-edit-dialog 内 4 input 全て covered)。
 *
 * 課題: item-edit-dialog の date input 2 つ (editStart / editDue) は enterKeyHint 未指定。
 *   iter962 で editTitle/editDescription に "next" 適用したが date input は別 iter 候補と
 *   していた。完備により dialog 内 form-flow の Mobile keyboard signal が complete。
 *
 * fix: item-edit-dialog.tsx の editStart / editDue 両 IMEInput に enterKeyHint="next" 追加
 *   (開始日 → 期限 → Sprint select へ flow)。+2/-0 行 (1 file)。視覚 / 動作不変。
 *   browser の date picker overlay 挙動は OS / browser 依存 (Mobile Safari は picker、
 *   Chrome Android は native date dropdown) のため Enter 動作は環境依存だが、enterKeyHint
 *   設定で「次フィールド意図」 を OS hint として渡せる。
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
  checkInputContext('editStart', 'next')
  checkInputContext('editDue', 'next')

  // iter964 invariant: time-entry-form enterKeyHint
  const teSrc = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="next"/.test(teSrc) || !/enterKeyHint="send"/.test(teSrc)) {
    findings.push({ level: 'warning', message: `iter964 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter964 invariant OK` })
  }

  // iter963 invariant: quick-add
  const quickAddSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'),
    'utf8',
  )
  if (!/enterKeyHint="send"/.test(quickAddSrc)) {
    findings.push({ level: 'warning', message: `iter963 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter963 invariant OK` })
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

  console.log(`\n=== Findings (item-edit-date-enter-key-hint-iter965) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
