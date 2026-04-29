/**
 * Phase 6.15 loop iter 375 — login / signup form の `handleSubmit` 第 2
 * 引数として `onInvalid` handler を追加し、zod validation 失敗時に
 * 第 1 errored field へ自動 focus を移動。WCAG SC 3.3.1 (Error
 * Identification) を programmatic focus shift で強化。
 *
 * 課題: 旧 form は `onSubmit={form.handleSubmit(onSubmit)}` のみで
 *   onInvalid 引数なし。zod validation が失敗した場合 (例: email 空の
 *   まま submit)、`<p role="alert">` で error が表示されるが focus は
 *   submit button 等に残ったまま、user は手動で errored field へ Tab
 *   navigation する必要があった。SR ユーザは alert announce で error
 *   を聞くが focus は移動せず、修正のため field を探す cognitive load
 *   が高い。
 *
 * fix: `function onInvalid(errors)` を追加 (5 行)、`Object.keys(errors)[0]`
 *   で第 1 errored field を取得し `form.setFocus(field)` で focus 移動。
 *   `handleSubmit(onSubmit, onInvalid)` で wire up (1 行差替)。
 *   2 file × 6 行 = 計 12 行追加。zod schema field order が Object.keys
 *   の insertion order を保つため、UI の visual order (上から下) と
 *   focus 移動先が一致する直感的 UX。
 *
 * UX 卓越:
 *   (a) zod validation 失敗時に focus が即座に第 1 errored field へ
 *       移動、修正のための navigation が不要、
 *   (d) WCAG SC 3.3.1 (Error Identification) を SR alert announce +
 *       focus shift の二段で強化、
 *   (e) iter255 (server error → setFocus 'password' / 'email') の
 *       pattern を validation error にも展開、focus management の
 *       一貫性確立。
 *
 * 機能追加なし、shadcn 編集なし、影響面 2 ファイル。
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

  const cases = [
    { file: 'src/components/auth/login-form.tsx', label: 'login' },
    { file: 'src/components/auth/signup-form.tsx', label: 'signup' },
  ]

  for (const c of cases) {
    const src = readFileSync(resolve(process.cwd(), c.file), 'utf8')
    if (!/function onInvalid\(errors:[\s\S]+?form\.setFocus\(firstError\)/.test(src)) {
      findings.push({
        level: 'warning',
        message: `${c.file}: onInvalid handler 不在 or setFocus 未呼出`,
      })
    } else {
      findings.push({ level: 'info', message: `${c.label}: onInvalid handler OK` })
    }
    if (!/handleSubmit\(onSubmit, onInvalid\)/.test(src)) {
      findings.push({
        level: 'warning',
        message: `${c.file}: handleSubmit に onInvalid wire up されていない`,
      })
    }
    // 既存 invariant: server error 時の setFocus
    if (!/form\.setFocus\(['"](password|email)['"]\)/.test(src)) {
      findings.push({
        level: 'warning',
        message: `${c.file}: server error setFocus が消えた (regression)`,
      })
    }
  }

  console.log(`\n=== Findings (onInvalid-focus-iter375) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
