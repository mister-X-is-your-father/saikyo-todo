/**
 * Phase 6.15 loop iter 911 (mode-D Desktop a11y) —
 * template instantiate-form var-{template.id}-{v} input aria-label を WCAG 2.5.3
 * (Label in Name) 適合形に変更 (4 case 一括)。
 *
 * 課題: src/components/template/instantiate-form.tsx の Mustache 変数値 input は
 *   visible <Label> "変数: {v}" を持つが、旧 aria-label "Mustache 変数「{v}」 の値 (...)" /
 *   "Mustache 変数「{v}」 (...)" は visible "変数: {v}" を contiguous substring に持たない
 *   (visible は ":" + space + value、aria-label は "「value」" の差) → WCAG 2.5.3 違反 (4 case)。
 *
 * fix (1 ファイル / +4-4 行差分、4 case 一括):
 *   - aria-label を `変数: ${v} (Mustache 変数「${v}」、{制約 / 文字数})` 形に統一し
 *     visible "変数: ${v}" prefix 適合化
 *
 * 検証: source-side regex assert + iter909/910 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tf = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )

  // 1. empty aria-label に "変数: ${v}" prefix
  if (
    /`変数: \$\{v\} \(Mustache 変数「\$\{v\}」の値、必須、最大 500 文字、template の \{\{\$\{v\}\}\} に展開時 substitute される\)`/.test(
      tf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `var-input empty aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `var-input empty aria-label 不含` })
  }

  // 2. blank-only aria-label
  if (
    /`変数: \$\{v\} \(Mustache 変数「\$\{v\}」、現在 \$\{val\.length\} \/ 500 文字、空白のみは不正\)`/.test(
      tf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `var-input blank-only aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `var-input blank-only aria-label 不含` })
  }

  // 3. near-limit aria-label
  if (
    /`変数: \$\{v\} \(Mustache 変数「\$\{v\}」、現在 \$\{val\.length\} \/ 500 文字、上限近接\)`/.test(
      tf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `var-input near-limit aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `var-input near-limit aria-label 不含` })
  }

  // 4. normal aria-label
  if (/`変数: \$\{v\} \(Mustache 変数「\$\{v\}」、現在 \$\{val\.length\} \/ 500 文字\)`/.test(tf)) {
    findings.push({
      level: 'info',
      message: `var-input normal aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `var-input normal aria-label 不含` })
  }

  // 5. 旧 aria-label "Mustache 変数「{v}」 の値" 削除
  if (!/`Mustache 変数「\$\{v\}」 の値 \(必須/.test(tf)) {
    findings.push({
      level: 'info',
      message: `var-input 旧 aria-label "Mustache 変数「..」 の値" 削除済 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `var-input 旧 aria-label 残存` })
  }

  // iter910 invariant: subtasks-bulk
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (
    /'改行区切りで bulk 追加 \(Cmd\/Ctrl\+Enter で追加\): 子タスク bulk 追加用 textarea'/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter910 invariant: subtasks-bulk aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter910 invariant: subtasks-bulk 破壊` })
  }

  console.log(`\n=== Findings (template-instantiate-var-iter911) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
