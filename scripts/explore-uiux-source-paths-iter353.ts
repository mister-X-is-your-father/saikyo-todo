/**
 * Phase 6.15 loop iter 353 — integrations-panel の Source 設定 4 path input
 * (items-path / due-path / id-path / title-path) に autoComplete="off" +
 * spellCheck={false} を追加。
 *
 * 課題: 各 path は API レスポンス JSON の dot-path (例 "data.items" / "due_date")
 *   で app 固有 ID 風文字列、browser autoComplete 候補は無関係 / spell check は
 *   slug-style キーで誤検出 (赤線で集中阻害)。
 *
 * fix: 4 input に `autoComplete="off"` + `spellCheck={false}` を追加 (4 input × 2 行
 *   = 8 行追加)。あわせて iter352 verifier の TS 文法 fix (lines[i] が undefined
 *   になり得る箇所に nullish coalescing) も含む。
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
  const target = 'src/components/integrations/integrations-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 4 path input に autoComplete + spellCheck
  for (const id of ['src-items-path', 'src-due-path', 'src-id-path', 'src-title-path']) {
    const block = src.match(new RegExp(`<IMEInput[\\s\\S]*?id="${id}"[\\s\\S]*?\\/>`))
    if (!block) {
      findings.push({ level: 'error', message: `${target}: id="${id}" Input not found` })
      continue
    }
    if (!/autoComplete="off"/.test(block[0])) {
      findings.push({ level: 'warning', message: `${target}: id=${id} autoComplete 不在` })
    }
    if (!/spellCheck=\{false\}/.test(block[0])) {
      findings.push({ level: 'warning', message: `${target}: id=${id} spellCheck 不在` })
    }
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: `${target}: 4 path input autoComplete+spellCheck OK` })
  }

  console.log(`\n=== Findings (source-paths-iter353) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
