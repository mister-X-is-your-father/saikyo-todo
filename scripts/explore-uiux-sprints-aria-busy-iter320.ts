/**
 * Phase 6.15 loop iter 320 — sprints-panel の 3 form 全部に aria-busy を展開
 * (iter319 create-workspace-form / iter312 budget-panel に続く aria-busy sweep の
 * 3 件目、最大規模 panel)。
 *
 * 課題: sprints-panel.tsx の 3 form (line 189: 新規 Sprint / line 481: 既存 Sprint
 *   期間編集 / line 759: workspace 全体 Sprint defaults) は iter304 で noValidate
 *   化済だが aria-busy は全 form 漏れていた。Sprint 作成 / 期間編集 / defaults
 *   保存いずれも mutation pending 中 SR が "busy" を audible に通知できず WCAG
 *   4.1.3 (Status Messages, Level AA) 非対応。
 *
 * fix: 各 form に `aria-busy={<対応 mutation>.isPending || undefined}` を追加
 *   (3 行追加)。それぞれ createMut / update / upd と mutation 名が異なるので
 *   各 form の正しい mut を選定。
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
  const target = 'src/components/workspace/sprints-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // form 数 = aria-busy 付き form 数
  const formMatches = src.match(/<form\b/g) ?? []
  const ariaBusyForms =
    src.match(/<form\b[\s\S]*?aria-busy=\{[a-zA-Z]+\.isPending \|\| undefined\}/g) ?? []
  if (formMatches.length !== ariaBusyForms.length) {
    findings.push({
      level: 'warning',
      message: `${target}: <form>=${formMatches.length}, aria-busy 付き=${ariaBusyForms.length}`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `${target}: 全 ${formMatches.length} form に aria-busy 付与 OK`,
    })
  }

  // 各 form の正しい mut 名が使われている
  if (!/aria-busy=\{createMut\.isPending \|\| undefined\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: 新規 Sprint form の createMut.isPending 不在`,
    })
  }
  if (!/aria-busy=\{update\.isPending \|\| undefined\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: 期間編集 form の update.isPending 不在`,
    })
  }
  if (!/aria-busy=\{upd\.isPending \|\| undefined\}/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: defaults form の upd.isPending 不在` })
  }

  // iter255/iter312/iter319 invariant
  for (const path of [
    'src/components/auth/login-form.tsx',
    'src/components/auth/signup-form.tsx',
    'src/components/workspace/budget-panel.tsx',
    'src/components/workspace/create-workspace-form.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (!/aria-busy=\{[^}]*isPending[^}]*undefined\}/.test(s)) {
      findings.push({ level: 'warning', message: `${path}: aria-busy 回帰` })
    }
  }

  console.log(`\n=== Findings (sprints-aria-busy-iter320) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
