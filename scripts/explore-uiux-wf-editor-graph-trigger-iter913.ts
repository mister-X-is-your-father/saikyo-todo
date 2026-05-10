/**
 * Phase 6.15 loop iter 913 (mode-D Desktop a11y) —
 * workflow-panel wf-editor-graph + wf-editor-trigger Textarea aria-label を WCAG
 * 2.5.3 (Label in Name) 適合形に変更 (一括 2 textarea × 3 case)。
 *
 * 課題: src/components/workflow/workflows-panel.tsx の Workflow editor 内 graph + trigger
 *   Textarea は visible <Label>:
 *   - graph: "graph ({ nodes: [...], edges: [...] })"
 *   - trigger: "trigger ({ kind: "manual" | "cron" | "item-event" | "webhook" })"
 *   旧 aria-label "graph JSON (...)" / "trigger JSON (...)" は visible の "(JSON 構造)"
 *   括弧内容を含まず substring 不適合 → WCAG 2.5.3 違反 (各 3 case)。
 *
 * fix (1 ファイル / +6-6 行差分、2 textarea × 3 case 一括):
 *   - graph aria-label: `graph ({ nodes: [...], edges: [...] }): {状態 / 文字数}` 形
 *   - trigger aria-label: `trigger ({ kind: "manual" | "cron" | "item-event" | "webhook" }): {状態 / 文字数}` 形
 *
 * 検証: source-side regex assert + iter911/912 invariant cross-check。
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

  // 1. wf-editor-graph empty aria-label に visible prefix
  if (
    /'graph \(\{ nodes: \[\.\.\.\], edges: \[\.\.\.\] \}\): workflow の node 定義 JSON、上のプリセット button で skeleton 追加可'/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `wf-editor-graph empty aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-editor-graph empty aria-label 不含` })
  }

  // 2. wf-editor-graph normal aria-label に visible prefix
  if (
    /`graph \(\{ nodes: \[\.\.\.\], edges: \[\.\.\.\] \}\): 現在 \$\{graphText\.length\} 文字、node 定義 JSON`/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `wf-editor-graph normal aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-editor-graph normal aria-label 不含` })
  }

  // 3. wf-editor-trigger empty aria-label に visible prefix
  if (
    /'trigger \(\{ kind: "manual" \| "cron" \| "item-event" \| "webhook" \}\): manual \/ cron \/ item-event \/ webhook の 4 種、上のプリセット button で template 挿入可'/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `wf-editor-trigger empty aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-editor-trigger empty aria-label 不含` })
  }

  // 4. wf-editor-trigger normal aria-label に visible prefix
  if (
    /`trigger \(\{ kind: "manual" \| "cron" \| "item-event" \| "webhook" \}\): 現在 \$\{triggerText\.length\} 文字、起動条件 JSON`/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `wf-editor-trigger normal aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-editor-trigger normal aria-label 不含` })
  }

  // 5. 旧 aria-label "graph JSON (workflow..." 削除
  if (
    !/'graph JSON \(workflow の node 定義を JSON で記述、上のプリセット button で skeleton 追加可\)'/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `wf-editor-graph 旧 aria-label "graph JSON (...)" 削除済 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-editor-graph 旧 aria-label 残存` })
  }

  // iter912 invariant: edit-item-dod
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /'DoD \(完了条件\): MUST item は必須、Definition of Done、空欄では保存・done 遷移不可'/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter912 invariant: edit-item-dod aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter912 invariant: edit-item-dod 破壊` })
  }

  console.log(`\n=== Findings (wf-editor-graph-trigger-iter913) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
