/**
 * Phase 6.15 loop iter 295 — create-workspace-form.tsx で iter278 / iter282
 * パターンの aria-invalid 修正が漏れていた問題。
 *
 * iter278 で /login と /signup の各 input の aria-invalid を
 * `Boolean(form.formState.errors.X)` (false 明示で SR ノイズ) から
 * `form.formState.errors.X ? true : undefined` (error 時のみ属性出現) に
 * 統一していたが、`src/components/workspace/create-workspace-form.tsx` の
 * 2 箇所 (name input + slug input) に Boolean(...) が残存していた。
 *
 * 結果として CreateWorkspaceForm 表示時に常時 `aria-invalid="false"` が
 * DOM に出て一部 SR で「無効ではない」を冗長 announce → SR ノイズ。
 *
 * 期待 (fix 後):
 *   `aria-invalid={form.formState.errors.X ? true : undefined}` 統一。
 *   非エラー時に属性自体が DOM に出ない。
 *
 * Supabase 必須画面 (HomePage で workspace 一覧を取得した後の Card 内で
 * 描画) のため runtime 検証は環境依存。source 側 regex assert で fix を
 * verify。
 *
 *   pnpm tsx scripts/explore-uiux-create-workspace-aria-invalid-iter295.ts
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

  // 1. Boolean(...) パターンの aria-invalid が残っていない
  const booleanMatches = Array.from(src.matchAll(/aria-invalid=\{Boolean\([^)]+\)\}/g))
  if (booleanMatches.length > 0) {
    findings.push({
      level: 'warning',
      message: `create-workspace-form.tsx: aria-invalid={Boolean(...)} 残存 ${booleanMatches.length} 件 (iter278 pattern 漏れ)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `create-workspace-form.tsx: aria-invalid={Boolean(...)} の残存無し`,
    })
  }

  // 2. ternary パターンの aria-invalid が 2 箇所 (name + slug) ある
  const ternaryMatches = Array.from(
    src.matchAll(/aria-invalid=\{form\.formState\.errors\.\w+ \? true : undefined\}/g),
  )
  findings.push({
    level: 'info',
    message: `aria-invalid ternary パターン = ${ternaryMatches.length} 件`,
  })
  if (ternaryMatches.length < 2) {
    findings.push({
      level: 'warning',
      message: `create-workspace-form.tsx: aria-invalid ternary が 2 件未満 (name + slug 各 1 期待)`,
    })
  }

  // 3. codebase 全体で Boolean(...) aria-invalid 残存無し (iter278 invariant)
  // sweep verify (回帰防止)
  const { execSync } = await import('node:child_process')
  let codebaseRemaining = 0
  try {
    const out = execSync(
      'grep -rn "aria-invalid={Boolean" src/components --include="*.tsx" || true',
      { encoding: 'utf8' },
    )
    codebaseRemaining = out.split('\n').filter((l) => l.trim().length > 0).length
  } catch {
    codebaseRemaining = -1
  }
  findings.push({
    level: 'info',
    message: `codebase 全体 Boolean(...) aria-invalid 残存 = ${codebaseRemaining} 件`,
  })
  if (codebaseRemaining > 0) {
    findings.push({
      level: 'warning',
      message: `codebase に Boolean(...) aria-invalid が依然存在 (iter278 invariant 違反)`,
    })
  }

  console.log(`\n=== Findings (create-workspace-aria-invalid-iter295) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
