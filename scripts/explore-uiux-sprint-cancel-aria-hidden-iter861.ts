/**
 * Phase 6.15 loop iter 861 (mode-D Desktop a11y) —
 * sprints-panel sprint-cancel button: visible "中止" を span aria-hidden で wrap
 * + aria-label に「割当 Item は残る」 hint 追加 (mental model 補強)。
 *
 * 課題: src/components/workspace/sprints-panel.tsx の sprint-cancel button は
 *   aria-label "Sprint「{name}」を中止(中…)" が visible "中止" を完全含むため
 *   WCAG 2.5.3 適合だったが、(1) iter844-860 campaign 規約 (visible aria-hidden
 *   単独経路) から外れていた、(2) confirm dialog で「割当中の Item は外れず残る」
 *   と説明しているのに aria-label からは伝わらず SR ユーザは無自覚で実行する
 *   リスクがあった。
 *
 * fix (1 ファイル / +4-3 行差分):
 *   - aria-label normal: `Sprint「${name}」を中止 (status を cancelled に、割当 Item は残る)`
 *   - aria-label pending: `Sprint「${name}」を中止中… (status を cancelled に遷移)`
 *   - visible "中止" を <span aria-hidden="true"> で wrap
 *   - X icon 既存 aria-hidden 維持
 *
 * 検証: source-side regex assert + iter858-860 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. normal aria-label に visible "中止" prefix + 割当 Item hint
  if (
    /`Sprint「\$\{sprint\.name\}」を中止 \(status を cancelled に、割当 Item は残る\)`/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `sprint-cancel normal aria-label に "中止" prefix + Item 残存 hint 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-cancel normal aria-label に "中止" prefix + hint 不整備`,
    })
  }

  // 2. pending aria-label に visible "中止" prefix
  if (/`Sprint「\$\{sprint\.name\}」を中止中… \(status を cancelled に遷移\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-cancel pending aria-label に "中止" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-cancel pending aria-label が "中止" を prefix に含まない`,
    })
  }

  // 3. visible "中止" span aria-hidden
  if (
    /data-testid=\{`sprint-cancel-\$\{sprint\.id\}`\}[\s\S]+?<span aria-hidden="true">中止<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-cancel visible "中止" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-cancel visible "中止" aria-hidden 未統合`,
    })
  }

  // iter860 invariant: planning-return aria-label
  if (/`Sprint「\$\{sprint\.name\}」を計画に戻す \(active → planning へ遷移\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter860 invariant: planning-return aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter860 invariant: planning-return 破壊` })
  }

  // iter859 invariant: sprint-complete aria-label
  if (/`Sprint「\$\{sprint\.name\}」を完了 \(active → completed へ遷移\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter859 invariant: sprint-complete aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter859 invariant: sprint-complete 破壊` })
  }

  // iter858 invariant: sprint-activate aria-label
  if (/`Sprint「\$\{sprint\.name\}」を稼働開始 \(planning → active へ遷移\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: sprint-activate aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: sprint-activate 破壊` })
  }

  console.log(`\n=== Findings (sprint-cancel-aria-hidden-iter861) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
