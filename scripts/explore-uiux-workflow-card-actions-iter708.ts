/**
 * Phase 6.15 loop iter 708 (mode-D Desktop a11y) —
 * workflows-panel workflow-card actions row に role=group + aria-label 追加
 * (iter701-707 button group 化 sweep の続き)。
 *
 * 課題: workflows-panel.tsx 行 308 の workflow card 内 actions row `<div>` (実行 / 編集 /
 *   有効化切替 / 削除 button 群) は role / aria-label 無し。
 *
 * fix (1 ファイル ~5 行差分):
 *   - row に `role="group"` + dynamic `aria-label={`Workflow「${wf.name}」の操作 (実行 / 編集 / 有効化切替 / 削除)`}`
 *
 * 検証: source-side regex assert + iter515-707 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wf = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )

  // 1. workflow-card actions row role=group + aria-label
  if (
    /role="group"\s*\n\s*aria-label=\{`Workflow「\$\{wf\.name\}」の操作 \(実行 \/ 編集 \/ 有効化切替 \/ 削除\)`\}/.test(
      wf,
    )
  ) {
    findings.push({ level: 'info', message: `workflow-card actions role=group + aria-label OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `workflow-card actions role=group + aria-label なし`,
    })
  }

  // 2. iter707 invariant: decompose row actions 維持
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`提案「\$\{proposal\.title\}」の操作 \(採用 \/ 却下\)`\}/.test(dpp)) {
    findings.push({ level: 'info', message: `iter707 invariant: decompose row actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter707 invariant: 破壊` })
  }

  // 3. iter706 invariant: decompose bulk actions 維持
  if (/aria-label="AI 分解提案の bulk 操作 \(全て採用 \/ 全て却下 \/ 再分解\)"/.test(dpp)) {
    findings.push({ level: 'info', message: `iter706 invariant: decompose bulk actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter706 invariant: 破壊` })
  }

  // 4. iter705 invariant: sprint-period-edit footer 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Sprint「\$\{sprint\.name\}」の期間編集 form 操作 \(キャンセル \/ 保存\)`\}/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `iter705 invariant: sprint-period-edit 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter705 invariant: 破壊` })
  }

  // 5. iter677 invariant: workflow run-row toggle / rerun focus-visible 維持
  if (
    /hover:bg-muted\/50 focus-visible:ring-ring flex w-full items-center gap-2 px-2 py-1\.5 text-left focus-visible:ring-2 focus-visible:outline-none/.test(
      wf,
    )
  ) {
    findings.push({ level: 'info', message: `iter677 invariant: wf run-row toggle 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter677 invariant: 破壊` })
  }

  console.log(`\n=== Findings (workflow-card-actions-iter708) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
