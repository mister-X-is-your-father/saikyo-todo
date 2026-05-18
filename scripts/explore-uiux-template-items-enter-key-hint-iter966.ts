/**
 * Phase 6.15 loop iter 966 (mode-M Mobile) — template-items-editor 新規 item 追加 form の
 * 2 input (タイトル / 期日 offset) に enterKeyHint="next" / "send" を追加。
 * iter949-965 enterKeyHint sweep 11 form 目、template 編集 form 補完。
 *
 * 課題: template-items-editor の add form の 2 input は enterKeyHint 未指定で
 *   Mobile keyboard の Enter button が default 表示。「次の field か submit か」 user 判別不能。
 *   iter957 で MUST checkbox label に min-h-11 適用済だが enterKeyHint は未着手だった。
 *
 * fix: template-items-editor.tsx で
 *   1. タイトル IMEInput に enterKeyHint="next" (タイトル → 期日 offset へ)
 *   2. 期日 offset input (number) に enterKeyHint="send" (期日 → form 追加 submit)
 *   +2/-0 行 (1 file)。視覚 / 動作不変。Mobile keyboard "次へ" / "送信" 翻訳。
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
  const target = 'src/components/template/template-items-editor.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // タイトル IMEInput に enterKeyHint="next"
  const titleCtx = src.slice(
    src.indexOf('placeholder="子 Item のタイトル"'),
    src.indexOf('placeholder="子 Item のタイトル"') + 1500,
  )
  if (!/enterKeyHint="next"/.test(titleCtx)) {
    findings.push({
      level: 'warning',
      message: `${target}: 子 Item タイトル IMEInput に enterKeyHint="next" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `子 Item タイトル enterKeyHint="next" OK` })
  }

  // 期日 offset input に enterKeyHint="send"
  const offsetCtx = src.slice(
    src.indexOf('placeholder="期日 offset 日"'),
    src.indexOf('placeholder="期日 offset 日"') + 1500,
  )
  if (!/enterKeyHint="send"/.test(offsetCtx)) {
    findings.push({
      level: 'warning',
      message: `${target}: 期日 offset input に enterKeyHint="send" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `期日 offset enterKeyHint="send" OK` })
  }

  // iter957 invariant: MUST checkbox label min-h-11 (本 file)
  if (!/<label className="flex min-h-11 items-center gap-1 text-sm">/.test(src)) {
    findings.push({ level: 'warning', message: `iter957 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter957 invariant OK` })
  }

  // iter965 invariant: item-edit-dialog editStart enterKeyHint
  const itemEditSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  const startCtx = itemEditSrc.slice(
    Math.max(0, itemEditSrc.indexOf('id="editStart"') - 50),
    itemEditSrc.indexOf('id="editStart"') + 500,
  )
  if (!/enterKeyHint="next"/.test(startCtx)) {
    findings.push({ level: 'warning', message: `iter965 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter965 invariant OK` })
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

  console.log(`\n=== Findings (template-items-enter-key-hint-iter966) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
