/**
 * Phase 6.15 loop iter 906 (mode-D Desktop a11y) —
 * workflows-panel wf-desc + templates-panel tmpl-desc Textarea aria-label を WCAG
 * 2.5.3 (Label in Name) 適合形に変更 (一括 2 textarea)。
 *
 * 課題: iter905 と同 root cause。visible <Label> "(任意、Cmd/Ctrl+Enter で作成)" や
 *   "(Cmd/Ctrl+Enter で作成)" を旧 aria-label が contiguous substring に持たない:
 *   - wf-desc visible "説明 (任意、Cmd/Ctrl+Enter で作成)" / 旧 aria-label "Workflow の説明 (任意、最大 2000 文字、Cmd/Ctrl+Enter で作成)" → "(任意、" と "Cmd/Ctrl+Enter" の間に「最大 2000 文字、」挿入で分断
 *   - tmpl-desc visible "説明 (Cmd/Ctrl+Enter で作成)" / 旧 aria-label "Template の説明 (任意、このテンプレートが何を生成するか、Cmd/Ctrl+Enter で作成)" → "(任意、" prefix で visible "(Cmd/Ctrl+Enter で作成)" と乖離
 *
 * fix (2 ファイル / +5-5 行差分、2 textarea 一括):
 *   - wf-desc aria-label: `説明 (任意、Cmd/Ctrl+Enter で作成): Workflow の説明、{制約}` 形 (3 case)
 *   - tmpl-desc aria-label: `説明 (Cmd/Ctrl+Enter で作成): Template の説明、{制約}` 形 (2 case)
 *
 * 検証: source-side regex assert + iter904/905 invariant cross-check。
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
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )

  // 1. wf-desc empty aria-label に "説明 (任意、Cmd/Ctrl+Enter で作成)" prefix
  if (/'説明 \(任意、Cmd\/Ctrl\+Enter で作成\): Workflow の説明、最大 2000 文字'/.test(wp)) {
    findings.push({
      level: 'info',
      message: `wf-desc empty aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-desc empty aria-label 不含` })
  }

  // 2. wf-desc near-limit aria-label
  if (
    /`説明 \(任意、Cmd\/Ctrl\+Enter で作成\): Workflow の説明、現在 \$\{description\.length\} \/ 2000 文字、上限近接`/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `wf-desc near-limit aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `wf-desc near-limit aria-label 不含` })
  }

  // 3. tmpl-desc empty aria-label
  if (
    /'説明 \(Cmd\/Ctrl\+Enter で作成\): Template の説明、任意、このテンプレートが何を生成するか'/.test(
      tp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `tmpl-desc empty aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `tmpl-desc empty aria-label 不含` })
  }

  // 4. tmpl-desc filled aria-label
  if (
    /`説明 \(Cmd\/Ctrl\+Enter で作成\): Template の説明、現在 \$\{description\.length\} 文字`/.test(
      tp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `tmpl-desc filled aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `tmpl-desc filled aria-label 不含` })
  }

  // 5. 旧 aria-label 削除確認
  if (!/'Workflow の説明 \(任意、最大 2000 文字、Cmd\/Ctrl\+Enter で作成\)'/.test(wp)) {
    findings.push({ level: 'info', message: `wf-desc 旧 aria-label 削除済 OK` })
  } else {
    findings.push({ level: 'warning', message: `wf-desc 旧 aria-label 残存` })
  }
  if (
    !/'Template の説明 \(任意、このテンプレートが何を生成するか、Cmd\/Ctrl\+Enter で作成\)'/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `tmpl-desc 旧 aria-label 削除済 OK` })
  } else {
    findings.push({ level: 'warning', message: `tmpl-desc 旧 aria-label 残存` })
  }

  // iter905 invariant: goal-desc aria-label
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /'説明 \(任意、Cmd\/Ctrl\+Enter で作成\): Goal の説明、最大 2000 文字、Objective の補足や背景'/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter905 invariant: goal-desc aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter905 invariant: goal-desc 破壊` })
  }

  console.log(`\n=== Findings (wf-tmpl-desc-label-in-name-iter906) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
