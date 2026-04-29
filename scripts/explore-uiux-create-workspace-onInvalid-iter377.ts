/**
 * Phase 6.15 loop iter 377 — `CreateWorkspaceForm` の handleSubmit に
 * onInvalid handler を追加 (iter375 の login/signup pattern を workspace
 * create form に水平展開)。zod validation 失敗時に第 1 errored field へ
 * 自動 focus 移動。
 *
 * 課題: src/components/workspace/create-workspace-form.tsx は
 *   `onSubmit={form.handleSubmit(onSubmit)}` で onInvalid 引数なし。
 *   iter375 で auth form (login/signup) には onInvalid 追加済だったが、
 *   workspace 初回 onboarding で使う create-workspace-form は未対応で
 *   patternが断絶。zod validation 失敗時 (例: name 空 / slug pattern 不一致)
 *   focus は submit button 等に残り、user は手動で field を探す。
 *
 * fix: `function onInvalid(errors)` を追加 (4 行)、`Object.keys(errors)[0]`
 *   で第 1 errored field を取得し `form.setFocus(field)` で focus 移動。
 *   `handleSubmit(onSubmit, onInvalid)` で wire up (1 行差替)。1 file
 *   5 行追加。CreateWorkspaceInput の field order (name → slug) と
 *   focus 移動先が一致する直感的 UX。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex assert で codify。実 form 動作は workspace
 *   page (auth 必須) のため cloud env で integration test 不可。
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

  if (!/function onInvalid\(errors:[\s\S]+?form\.setFocus\(firstError\)/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: onInvalid handler 不在 or setFocus 未呼出`,
    })
  } else {
    findings.push({ level: 'info', message: 'create-workspace onInvalid handler OK' })
  }
  if (!/handleSubmit\(onSubmit, onInvalid\)/.test(src)) {
    findings.push({
      level: 'warning',
      message: 'handleSubmit に onInvalid wire up されていない',
    })
  }

  // iter375 の login/signup invariant 維持
  for (const f of ['src/components/auth/login-form.tsx', 'src/components/auth/signup-form.tsx']) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (!/function onInvalid\(errors:/.test(s) || !/handleSubmit\(onSubmit, onInvalid\)/.test(s)) {
      findings.push({
        level: 'warning',
        message: `${f}: iter375 onInvalid pattern が消えた (regression)`,
      })
    }
  }

  console.log(`\n=== Findings (create-workspace-onInvalid-iter377) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
