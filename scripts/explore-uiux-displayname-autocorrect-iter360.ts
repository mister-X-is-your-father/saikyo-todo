/**
 * Phase 6.15 loop iter 360 — signup form の displayName input に
 * `autoCorrect="off"` を追加。email input と同 pattern (autoCorrect off +
 * spellCheck false + autoCapitalize none を適切に組合せ) に揃え、iOS Safari
 * の autocorrect が romaji 表記の handle / username を勝手に書き換える
 * のを防止。
 *
 * 課題: signup form の displayName は `autoComplete="name"` + `spellCheck={false}`
 *   は持っていたが `autoCorrect="off"` 不在。iOS Safari は spellCheck と
 *   autoCorrect を独立に制御するため、spellCheck=false でも autoCorrect は
 *   default (on) で working。"iPhone_user_42" のような handle や英語固有名
 *   ("Mc" 接頭等) を typing 中に Safari が誤 correction する可能性。
 *
 * fix: signup-form.tsx の displayName IMEInput に `autoCorrect="off"` を追加
 *   (1 行)。`autoCapitalize` は default "sentences" のまま (英語 "John Smith"
 *   や日本語 IME 経由は影響なし、handle "iphone_user" は user が自分で大文字
 *   小文字 typing を選べる)。email input は autoCapitalize="none" にしている
 *   が、displayName は freeform name のため大文字許容。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル、1 行追加。
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
  const target = 'src/components/auth/signup-form.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // displayName IMEInput を抽出
  const displayNameBlock = src.match(
    /id="displayName"[\s\S]+?\.\.\.form\.register\('displayName'\)[\s\S]+?\/>/,
  )
  if (!displayNameBlock) {
    findings.push({ level: 'error', message: `${target}: displayName IMEInput block 不在` })
  } else {
    const block = displayNameBlock[0]
    if (!/autoCorrect="off"/.test(block)) {
      findings.push({ level: 'warning', message: `displayName: autoCorrect="off" 不在` })
    } else {
      findings.push({ level: 'info', message: `displayName: autoCorrect="off" OK` })
    }
    // 既存 invariant 維持確認
    if (!/spellCheck=\{false\}/.test(block)) {
      findings.push({
        level: 'warning',
        message: `displayName: spellCheck={false} が消えた (regression)`,
      })
    }
    if (!/autoComplete="name"/.test(block)) {
      findings.push({
        level: 'warning',
        message: `displayName: autoComplete="name" が消えた (regression)`,
      })
    }
  }

  // email input は既に autoCorrect="off" を持つこと (iter255 以前から)
  const emailBlock = src.match(/id="email"[\s\S]+?\.\.\.form\.register\('email'\)[\s\S]+?\/>/)
  if (emailBlock && !/autoCorrect="off"/.test(emailBlock[0])) {
    findings.push({
      level: 'warning',
      message: `email: autoCorrect="off" が消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (displayname-autocorrect-iter360) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
