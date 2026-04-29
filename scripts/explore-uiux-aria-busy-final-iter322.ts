/**
 * Phase 6.15 loop iter 322 — aria-busy sweep の **最終回** (production form
 * 15/15 達成)。
 *
 * iter319-321 続編、残 6 panel form (decompose-proposals / integrations / workflows /
 * time-entry / templates / template-items-editor / instantiate) に aria-busy を
 * batch 追加して production form (mock-timesheet test fixture 除く) **15/15 件で
 * aria-busy 統一達成**。WCAG 4.1.3 (Status Messages, Level AA) 適合性向上。
 *
 * fix: 各 form に `aria-busy={<mut>.isPending || undefined}` を追加 (7 行追加)。
 *   各 file の正しい mut 名 (update / create / createMut / addMut / mut) を
 *   選定して付与。
 *
 * 検証: source-side regex assert で codify (production form 全体 sweep)。
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // production form 全体 sweep: codebase 内 form (mock-timesheet 除く) に
  // aria-busy が完全付与されているか
  const allFormFiles = execSync('grep -rl "<form" src/components --include="*.tsx" || true', {
    encoding: 'utf8',
  })
    .split('\n')
    .filter((l) => l.length > 0 && !l.includes('mock-timesheet'))

  let totalForms = 0
  let totalAriaBusy = 0
  for (const f of allFormFiles) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    // <form の後に改行 or attribute があるパターンのみ count (comment 内 "<form>" 単独を除外)
    const c = (s.match(/<form\b(?:\s+[a-zA-Z]|\n)/g) ?? []).length
    const a = (s.match(/<form\b[\s\S]*?aria-busy=\{[^}]*?isPending[^}]*?\|\| undefined\}/g) ?? [])
      .length
    totalForms += c
    totalAriaBusy += a
    if (c !== a) {
      findings.push({
        level: 'warning',
        message: `${f}: <form>=${c}, aria-busy 付き=${a}`,
      })
    }
  }
  findings.push({
    level: 'info',
    message: `production form 全体: ${totalForms} 件中 ${totalAriaBusy} 件に aria-busy 付与`,
  })

  // 本 iter で fix した 7 ファイルを個別検証
  for (const path of [
    'src/components/workspace/decompose-proposals-panel.tsx',
    'src/components/integrations/integrations-panel.tsx',
    'src/components/workflow/workflows-panel.tsx',
    'src/components/time-entry/create-time-entry-form.tsx',
    'src/components/template/templates-panel.tsx',
    'src/components/template/template-items-editor.tsx',
    'src/components/template/instantiate-form.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (!/aria-busy=\{[^}]*?isPending[^}]*?\|\| undefined\}/.test(s)) {
      findings.push({ level: 'warning', message: `${path}: aria-busy 不在` })
    }
  }

  console.log(`\n=== Findings (aria-busy-final-iter322) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
