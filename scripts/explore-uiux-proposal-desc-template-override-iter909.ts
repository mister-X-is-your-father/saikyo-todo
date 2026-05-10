/**
 * Phase 6.15 loop iter 909 (mode-D Desktop a11y) —
 * decompose-proposals-panel proposal-edit p-desc + template instantiate-form
 * override-{id} input aria-label を WCAG 2.5.3 (Label in Name) 適合形に変更 (一括 2)。
 *
 * 課題:
 *   - p-desc-{id} visible "説明 (Cmd/Ctrl+Enter で保存)" / 旧 aria-label "提案 description (任意、最大 10000 文字、Markdown 可、Cmd/Ctrl+Enter で保存)" → "(Cmd/Ctrl+Enter で保存)" は末尾でしか appear せず substring 不適合
 *   - override-{id} visible "root Item タイトル (任意)" / 旧 aria-label "Template「{name}」展開時の root Item タイトル (任意、最大 500 文字、…)" → "(任意)" 単独形 不在
 *
 * fix (2 ファイル / +6-6 行差分、各 3 case 一括):
 *   - p-desc aria-label: `説明 (Cmd/Ctrl+Enter で保存): 提案 description、{制約}` 形
 *   - override aria-label: `root Item タイトル (任意): {context}` 形
 *
 * 検証: source-side regex assert + iter907/908 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  const tf = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )

  // 1. p-desc empty aria-label に "説明 (Cmd/Ctrl+Enter で保存)" prefix
  if (
    /'説明 \(Cmd\/Ctrl\+Enter で保存\): 提案 description、任意、最大 10000 文字、Markdown 可'/.test(
      dp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `p-desc empty aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `p-desc empty aria-label 不含` })
  }

  // 2. p-desc near-limit aria-label
  if (
    /`説明 \(Cmd\/Ctrl\+Enter で保存\): 提案 description、現在 \$\{description\.length\} \/ 10000 文字、上限近接`/.test(
      dp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `p-desc near-limit aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `p-desc near-limit aria-label 不含` })
  }

  // 3. override empty aria-label に "root Item タイトル (任意)" prefix
  if (
    /`root Item タイトル \(任意\): Template「\$\{template\.name\}」展開時、最大 500 文字、省略時は「\$\{template\.name\}」`/.test(
      tf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `override empty aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `override empty aria-label 不含` })
  }

  // 4. override near-limit aria-label
  if (/`root Item タイトル \(任意\): 現在 \$\{override\.length\} \/ 500 文字、上限近接`/.test(tf)) {
    findings.push({
      level: 'info',
      message: `override near-limit aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `override near-limit aria-label 不含` })
  }

  // 5. 旧 aria-label 削除
  if (
    !/'提案 description \(任意、最大 10000 文字、Markdown 可、Cmd\/Ctrl\+Enter で保存\)'/.test(dp)
  ) {
    findings.push({ level: 'info', message: `p-desc 旧 aria-label 削除済 OK` })
  } else {
    findings.push({ level: 'warning', message: `p-desc 旧 aria-label 残存` })
  }

  // iter908 invariant: src-project-ids
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/'project IDs \(1 件以上\): 必須、カンマ区切り — 例: proj-a, proj-b'/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter908 invariant: src-project-ids aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter908 invariant: src-project-ids 破壊` })
  }

  console.log(`\n=== Findings (proposal-desc-template-override-iter909) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
