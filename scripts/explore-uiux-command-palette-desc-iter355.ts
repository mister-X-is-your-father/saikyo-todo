/**
 * Phase 6.15 loop iter 355 — CommandPalette の CommandDialog に description prop を
 * 追加して SR の DialogDescription に keyboard hint を流し込む。
 *
 * 課題: shadcn/ui の CommandDialog は title (sr-only DialogTitle に流し込み) +
 *   description (sr-only DialogDescription に流し込み) を props で受ける。
 *   現状 description 不在で SR は DialogTitle "コマンドパレット" のみ読み上げ、
 *   操作方法 (Cmd+K で開閉 / ? で task 検索 / Enter で実行 / Esc で閉じる) が
 *   伝わらない。
 *
 * fix: description prop に keyboard hint 文字列を渡す。CommandDialog 内部で
 *   sr-only DialogDescription に流し込まれて SR ユーザに DialogContent open 直後
 *   に announce される (focus 移動と同時、natural turn-taking)。視覚 UI は変更なし。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル、約 4 行差替え。
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
  const target = 'src/components/shared/command-palette.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (!/<CommandDialog[\s\S]*?description="Cmd \/ Ctrl\+K で開閉/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: CommandDialog description 不在` })
  } else {
    findings.push({ level: 'info', message: `${target}: CommandDialog description OK` })
  }

  console.log(`\n=== Findings (command-palette-desc-iter355) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
