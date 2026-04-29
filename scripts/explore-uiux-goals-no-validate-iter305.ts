/**
 * Phase 6.15 loop iter 305 — goals-panel.tsx の 2 つの `<form>` で
 * noValidate 漏れによる dual validation 重複表示。
 *
 * iter303 (create-workspace-form) / iter304 (sprints-panel × 3) の続編。
 * goals-panel.tsx に 2 form (line 125: Goal 作成、line 642: KR 追加) が
 * noValidate 漏れ。各 input は zod schema で validate されており popup
 * は冗長。
 *
 * 期待 (fix 後):
 *   各 form に noValidate 追加 (2 行)、zod 単一 validation 経路統一。
 *
 *   pnpm tsx scripts/explore-uiux-goals-no-validate-iter305.ts
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
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  const formCount = (src.match(/<form\b/g) ?? []).length
  const formsWithNoValidate = src
    .split(/<form\b/)
    .slice(1)
    .filter((after) => {
      const tagEnd = after.indexOf('>')
      if (tagEnd === -1) return false
      return /\bnoValidate\b/.test(after.slice(0, tagEnd))
    }).length

  findings.push({
    level: 'info',
    message: `goals-panel.tsx: <form>=${formCount}, noValidate 付き=${formsWithNoValidate}`,
  })

  if (formCount !== formsWithNoValidate) {
    findings.push({
      level: 'warning',
      message: `goals-panel.tsx: ${formCount - formsWithNoValidate} 個の <form> に noValidate 漏れ`,
    })
  }

  console.log(`\n=== Findings (goals-no-validate-iter305) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
