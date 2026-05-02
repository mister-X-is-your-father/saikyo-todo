/**
 * Phase 6.15 loop iter 640 (mode-D Desktop a11y) —
 * workflows-panel graph + trigger JSON Textarea aria-label を 3-state 動的化
 * (36 input 統一達成、JSON parse error / 文字数 expose)。
 *
 * 課題: workflows-panel.tsx 行 522 (graph) + 行 615 (trigger) JSON Textarea は
 *   static aria-label のみで文字数 / parse error が aria 側で expose されない。
 *
 * fix (1 ファイル ~16 行差分、2 Textarea):
 *   - graph: 空欄 hint (プリセット button 案内) / parse error / 通常 (文字数)
 *   - trigger: 空欄 hint (4 種 trigger 案内) / parse error / 通常 (文字数)
 *
 * iter639 period-goal pattern を JSON Textarea 2 個に展開、saikyo-todo 内
 * 動的 aria-label が 36 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-639 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )

  // 1. graph 空欄 hint
  if (
    /graphText\.length === 0\s*\n?\s*\?\s*'graph JSON \(workflow の node 定義を JSON で記述、上のプリセット button で skeleton 追加可\)'/.test(
      wp,
    )
  ) {
    findings.push({ level: 'info', message: `graph 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `graph 空欄 hint なし` })
  }

  // 2. graph parse error hint
  if (/\?\s*`graph JSON \(現在 \$\{graphText\.length\} 文字、JSON parse error あり\)`/.test(wp)) {
    findings.push({ level: 'info', message: `graph parse error hint OK` })
  } else {
    findings.push({ level: 'warning', message: `graph parse error hint なし` })
  }

  // 3. trigger 空欄 hint
  if (
    /triggerText\.length === 0\s*\n?\s*\?\s*'trigger JSON \(manual \/ cron \/ item-event \/ webhook の 4 種、上のプリセット button で template 挿入可\)'/.test(
      wp,
    )
  ) {
    findings.push({ level: 'info', message: `trigger 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `trigger 空欄 hint なし` })
  }

  // 4. trigger 通常 hint
  if (/:\s*`trigger JSON \(現在 \$\{triggerText\.length\} 文字、起動条件 JSON\)`/.test(wp)) {
    findings.push({ level: 'info', message: `trigger 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `trigger 通常 hint なし` })
  }

  // 5. iter639 invariant: period-goal 維持
  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (
    /draft\.length === 0\s*\n?\s*\?\s*`\$\{periodLabelJa\(period\)\}ゴール \(任意、最大 2000 文字、この\$\{periodLabelJa\(period\)\}で達成したいこと、Cmd\/Ctrl\+Enter で保存\)`/.test(
      ppv,
    )
  ) {
    findings.push({ level: 'info', message: `iter639 invariant: period-goal 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter639 invariant: 破壊` })
  }

  // 6. iter622 invariant: wf-name 維持
  if (
    /name\.length === 0\s*\n?\s*\?\s*'Workflow 名前 \(必須、最大 200 文字、何を自動化するか分かる名前\)'/.test(
      wp,
    )
  ) {
    findings.push({ level: 'info', message: `iter622 invariant: wf-name 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter622 invariant: 破壊` })
  }

  console.log(`\n=== Findings (wf-graph-trigger-aria-iter640) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
