/**
 * Phase 6.15 loop iter 344 — sprints (sprint-name) + goals (goal-title + KR title)
 * + templates (tmpl-name + tmpl-cron) の主要 IMEInput に autoComplete="off"
 * 追加、iter343 続編 (autoComplete sweep の 5 件目で workspace 主要 input 制覇)。
 *
 * fix: 各 IMEInput の最後に autoComplete="off" を追加 (5 箇所, 5 行追加)。
 *   tmpl-cron はさらに spellCheck={false} も追加 (cron 表記は app 固有で
 *   spell check 候補も誤検出になりがち)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 3 ファイル。
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

  for (const [path, expected] of [
    ['src/components/workspace/sprints-panel.tsx', 1],
    ['src/components/workspace/goals-panel.tsx', 2],
    ['src/components/template/templates-panel.tsx', 2],
  ] as const) {
    const src = readFileSync(resolve(process.cwd(), path), 'utf8')
    const count = (src.match(/autoComplete="off"/g) ?? []).length
    if (count < expected) {
      findings.push({
        level: 'warning',
        message: `${path}: autoComplete="off" 必要 ${expected} 件 (現状 ${count})`,
      })
    } else {
      findings.push({ level: 'info', message: `${path}: autoComplete="off" ${count} 件 OK` })
    }
  }

  // iter343 invariant: create-workspace-form の autoComplete 維持
  const cw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if ((cw.match(/autoComplete="off"/g) ?? []).length < 2) {
    findings.push({ level: 'warning', message: 'create-workspace-form.tsx: iter343 回帰' })
  }

  console.log(`\n=== Findings (panels-autocomplete-iter344) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
