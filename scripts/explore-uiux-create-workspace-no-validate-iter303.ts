/**
 * Phase 6.15 loop iter 303 — create-workspace-form.tsx の `<form>` に
 * `noValidate` 属性が無く、HTML5 native validation と RHF zod validation の
 * **dual validation** で popup と inline error が重複する可能性。
 *
 * 現状: `<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">`
 * (noValidate 無し)。
 *
 * 各 input に required / minLength / pattern が設定されており、submit 時に
 * 以下が起こる:
 *   1. ブラウザ native validation が popup を出す
 *   2. RHF zod が onSubmit を block して inline `<p role="alert">` を出す
 *
 * 結果として **同じエラーが popup と inline で重複表示** され、user は
 * popup を閉じてから inline を読む必要があり UX が劣化。auth pages の
 * login-form / signup-form は `noValidate` を設定して RHF zod 単一に
 * 統一済 (iter5 等の歴史) → create-workspace-form のみ非対称。
 *
 * 加えて schema vs input attribute の minLength 不整合:
 *   - schema (CreateWorkspaceInputSchema): `slug.min(2)` (2 文字以上)
 *   - input attribute: `minLength={1}`
 * native validation は 1 文字で pass、zod は 2 文字未満で fail → 二重 UX。
 *
 * 期待 (fix 後):
 *   `<form noValidate ...>` で native validation を抑制、RHF zod 単一に
 *   統一。input の required / minLength / pattern 属性は SR への hint
 *   情報として残存 (HTML5 attribute は AT 用 metadata としても有用)。
 *
 * Supabase 必須画面 (create-workspace-form は HomePage で render) のため
 * runtime 検証は環境依存。source 側 regex assert で fix を verify。
 *
 *   pnpm tsx scripts/explore-uiux-create-workspace-no-validate-iter303.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const src = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )

  // 1. <form> に noValidate が付いている (multiline form 開始タグも許容)
  if (!/<form[^>]*?noValidate|<form[\s\S]*?\bnoValidate\b[\s\S]*?>/.test(src)) {
    findings.push({
      level: 'warning',
      message: `create-workspace-form.tsx: <form> に noValidate が無い (HTML5 native validation 有効、RHF zod と二重)`,
    })
  } else {
    findings.push({ level: 'info', message: `<form noValidate> 確認 OK` })
  }

  // 2. (回帰防止) auth forms の noValidate も維持
  for (const f of ['src/components/auth/login-form.tsx', 'src/components/auth/signup-form.tsx']) {
    const authSrc = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (!/<form[\s\S]*?\bnoValidate\b[\s\S]*?>/.test(authSrc)) {
      findings.push({
        level: 'warning',
        message: `${f}: <form noValidate> が消えている (既存 invariant 違反)`,
      })
    }
  }

  console.log(`\n=== Findings (create-workspace-no-validate-iter303) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
