/**
 * Phase 6.15 loop iter 321 — goals-panel の 2 form (Goal 作成 / KR 追加) に
 * aria-busy を展開、iter319-320 続編。
 *
 * 課題: goals-panel.tsx の form (line 125: 新規 Goal / line 658: KR 追加) は
 *   iter305 で noValidate 化済だが aria-busy 未付与。Goal は OKR-style 主目標
 *   作成、KR 追加は Goal 配下の Key Result 編集の hot path で SR が pending を
 *   audible に通知できない WCAG 4.1.3 非対応が残っていた。
 *
 * fix: 各 form に `aria-busy={<mut>.isPending || undefined}` を追加 (createMut /
 *   create)。2 form, 2 行追加。
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
  const target = 'src/components/workspace/goals-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

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

  if (!/aria-busy=\{createMut\.isPending \|\| undefined\}/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: createMut 不在` })
  }
  if (!/aria-busy=\{create\.isPending \|\| undefined\}/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: create (KR) 不在` })
  }

  // iter319/iter320 invariant
  for (const path of [
    'src/components/workspace/create-workspace-form.tsx',
    'src/components/workspace/sprints-panel.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (!/aria-busy=\{[^}]*isPending[^}]*undefined\}/.test(s)) {
      findings.push({ level: 'warning', message: `${path}: aria-busy 回帰` })
    }
  }

  console.log(`\n=== Findings (goals-aria-busy-iter321) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
