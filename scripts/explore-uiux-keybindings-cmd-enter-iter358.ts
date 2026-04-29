/**
 * Phase 6.15 loop iter 358 — `src/lib/keybindings.ts` の KEYBINDINGS list に
 * Cmd/Ctrl+Enter (Textarea 保存ショートカット) のエントリを追加。`?` で開く
 * KeybindingsHelpModal と Command Palette helper にも自動表示される。
 *
 * 課題: iter228 で comment thread に導入、iter313-318 で 8 Textarea に水平展開、
 *   iter356-357 で aria-keyshortcuts で programmatic 公開した Cmd/Ctrl+Enter
 *   shortcut が、`?` で開く visible 一覧 (KeybindingsHelpModal) には含まれず、
 *   ユーザは shortcut が存在することを発見できない。
 *
 * fix: KEYBINDINGS list に "Cmd+Enter / Ctrl+Enter" エントリを追加 (1 件、
 *   description で 8 Textarea への共通動作を要約)。Modal は KEYBINDINGS を
 *   group ごとに自動 render するので追加だけで visible 一覧に出る。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/lib/keybindings.ts'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (!/combo: 'Cmd\+Enter \/ Ctrl\+Enter'/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: Cmd+Enter エントリ不在` })
  } else {
    findings.push({ level: 'info', message: `${target}: Cmd+Enter エントリ OK` })
  }

  console.log(`\n=== Findings (keybindings-cmd-enter-iter358) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
