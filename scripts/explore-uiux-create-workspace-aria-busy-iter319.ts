/**
 * Phase 6.15 loop iter 319 — create-workspace-form の <form> に aria-busy を
 * 追加 (auth login/signup forms と同 pattern、iter312 budget-panel に続く
 * aria-busy sweep の 3 件目)。
 *
 * 課題: ワークスペース作成 form は HomePage で初回 onboarding の主要 entry。
 *   isPending 中は submit button text を「作成中…」に切替えるが、`<form>`
 *   要素の `aria-busy` 不在で SR ユーザは form 全体が処理中であることを
 *   audible に知らされない。auth login-form / signup-form は iter255 周辺で
 *   `aria-busy={isPending || undefined}` を form に付与済、iter312 で budget-panel
 *   form にも展開済、本 form のみ漏れていた。
 *
 * fix: `<form aria-busy={isPending || undefined} ...>` を追加 (1 行追加 + 整形で
 *   3 行差替え)。SR は pending 中 "busy" を 1 度 announce、終了で "no longer busy"
 *   報告。WCAG 4.1.3 (Status Messages, Level AA) 適合性向上。
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

  if (!/<form\b[\s\S]*?aria-busy=\{isPending \|\| undefined\}[\s\S]*?>/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: aria-busy 不在` })
  } else {
    findings.push({ level: 'info', message: `${target}: aria-busy OK` })
  }

  // iter255 / iter312 invariant: auth forms と budget-panel の aria-busy 維持
  for (const [path, label] of [
    ['src/components/auth/login-form.tsx', 'iter255 login'],
    ['src/components/auth/signup-form.tsx', 'iter255 signup'],
    ['src/components/workspace/budget-panel.tsx', 'iter312 budget'],
  ] as const) {
    const s = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (
      !/aria-busy=\{[a-zA-Z.]*\.?isPending \|\| undefined\}|aria-busy=\{isPending \|\| undefined\}/.test(
        s,
      )
    ) {
      findings.push({ level: 'warning', message: `${path}: ${label} aria-busy 回帰` })
    }
  }

  console.log(`\n=== Findings (create-workspace-aria-busy-iter319) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
