/**
 * Phase 6.15 loop iter 343 — create-workspace-form の name + slug input に
 * `autoComplete="off"` を追加 (browser auto-fill 誤候補抑制)。
 *
 * 課題: Workspace 名 / slug は user 固有 / app 固有で browser の autoComplete
 *   候補 (organization / username / name 等) と意味的にも合致しない。空欄で
 *   browser が無関係な候補をドロップダウン表示すると UX 阻害。auth login/signup
 *   は autoComplete="email" / "current-password" / "new-password" / "name" と
 *   適切に設定済 (iter255 周辺)、本 form のみ未対応。
 *
 * fix: name / slug input に `autoComplete="off"` 明示 (slug は既存の
 *   `autoCapitalize="none" autoCorrect="off" spellCheck={false}` の隣に追加)。
 *   browser は autoComplete="off" を respect (Chrome / Safari / Firefox 全部、
 *   Chrome は password 系では override する仕様だが本 form は password 無し)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル、約 4 行差替え (コメント含)。
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
  const target = 'src/components/workspace/create-workspace-form.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  const autoCompleteOff = (src.match(/autoComplete="off"/g) ?? []).length
  if (autoCompleteOff < 2) {
    findings.push({
      level: 'warning',
      message: `${target}: autoComplete="off" が name + slug 両方必要 (現状 ${autoCompleteOff} 件)`,
    })
  }

  // iter255 invariant: auth forms の autoComplete 維持
  for (const path of [
    'src/components/auth/login-form.tsx',
    'src/components/auth/signup-form.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (!/autoComplete="email"/.test(s)) {
      findings.push({ level: 'warning', message: `${path}: autoComplete email 回帰` })
    }
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: `${target}: name + slug autoComplete=off OK` })
  }

  console.log(`\n=== Findings (create-ws-autocomplete-iter343) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
