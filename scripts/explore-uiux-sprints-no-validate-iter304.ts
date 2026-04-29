/**
 * Phase 6.15 loop iter 304 — sprints-panel.tsx の 3 つの `<form>` で
 * `noValidate` 漏れによる HTML5 native validation popup と RHF / 自前
 * validation の dual validation 重複表示。
 *
 * iter303 (create-workspace-form) の続編。codebase 全体の form を grep
 * で sweep した結果、sprints-panel.tsx に 3 form (line 189: 新規 sprint
 * 作成、line 464: 既存 sprint 編集、line 741: workspace 全体 sprint
 * defaults) が noValidate 漏れで HTML5 native validation popup を出す
 * 状態。各 input は zod schema で validate されており popup は冗長。
 *
 * 期待 (fix 後):
 *   各 form に noValidate を追加 (3 行)。zod 単一 validation 経路。
 *
 * Supabase 必須画面のため runtime 検証は環境依存。source 側 regex assert
 * で 3 form 全てに noValidate が付くことを verify。
 *
 *   pnpm tsx scripts/explore-uiux-sprints-no-validate-iter304.ts
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
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. <form> 出現数 = noValidate 含む <form> 出現数
  const formCount = (src.match(/<form\b/g) ?? []).length
  // <form ...\n...noValidate...> をマッチ (multiline allow)
  const formsWithNoValidate = src
    .split(/<form\b/)
    .slice(1)
    .filter((after) => {
      const tagEnd = after.indexOf('>')
      if (tagEnd === -1) return false
      const tag = after.slice(0, tagEnd)
      return /\bnoValidate\b/.test(tag)
    }).length

  findings.push({
    level: 'info',
    message: `<form> 出現数=${formCount} / noValidate 付き=${formsWithNoValidate}`,
  })

  if (formCount !== formsWithNoValidate) {
    findings.push({
      level: 'warning',
      message: `sprints-panel.tsx: ${formCount - formsWithNoValidate} 個の <form> に noValidate が漏れている`,
    })
  }

  console.log(`\n=== Findings (sprints-no-validate-iter304) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
