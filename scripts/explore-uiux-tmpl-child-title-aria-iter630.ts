/**
 * Phase 6.15 loop iter 630 (mode-D Desktop a11y) —
 * template-items-editor 子 Item title IMEInput aria-label を 4-state 動的化
 * (24 input 統一達成、Mustache hint)。
 *
 * 課題: template-items-editor.tsx 行 95-107 の子 Item title IMEInput は
 *   aria-label が static "子 Item のタイトル" のみで文字数 / 上限が aria 側で
 *   expose されない。Mustache 変数 hint も visible になし。
 *
 * fix (1 ファイル ~9 行差分):
 *   - aria-label 4-state 動的化 (max 500、空欄 hint に Mustache 変数 hint 追加)
 *
 * iter629 tmpl-cron pattern を子 Item title に展開、saikyo-todo 内 動的
 * aria-label が 24 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-629 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )

  // 1. 空欄 hint
  if (
    /title\.length === 0\s*\n?\s*\?\s*'子 Item のタイトル \(必須、最大 500 文字、Mustache 変数 \{\{var\}\} 利用可\)'/.test(
      tie,
    )
  ) {
    findings.push({ level: 'info', message: `tmpl-child-title 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `tmpl-child-title 空欄 hint なし` })
  }

  // 2. 空白のみ hint
  if (
    /title\.trim\(\) === ''\s*\n?\s*\?\s*`子 Item のタイトル \(現在 \$\{title\.length\} \/ 500 文字、空白のみは不正\)`/.test(
      tie,
    )
  ) {
    findings.push({ level: 'info', message: `tmpl-child-title 空白のみ hint OK` })
  } else {
    findings.push({ level: 'warning', message: `tmpl-child-title 空白のみ hint なし` })
  }

  // 3. 上限近接 hint
  if (
    /title\.length > 480\s*\n?\s*\?\s*`子 Item のタイトル \(現在 \$\{title\.length\} \/ 500 文字、上限近接\)`/.test(
      tie,
    )
  ) {
    findings.push({ level: 'info', message: `tmpl-child-title 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `tmpl-child-title 上限近接 hint なし` })
  }

  // 4. iter629 invariant: tmpl-cron 維持
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (
    /scheduleCron\.length === 0\s*\n?\s*\?\s*'cron 式 \(任意、5 フィールド標準 cron 形式 — 例: 「0 9 \* \* 1」 で毎週月曜 09:00\)'/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `iter629 invariant: tmpl-cron 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter629 invariant: 破壊` })
  }

  // 5. iter628 invariant: src-id-path 維持
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (
    /idPath\.length === 0\s*\n?\s*\?\s*'id path \(必須、各 item の一意 ID を取り出す JSON dot-path — 例: id\)'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `iter628 invariant: src-id-path 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter628 invariant: 破壊` })
  }

  // 6. iter613 invariant: tmpl-name 4-state 維持
  if (
    /name\.length === 0\s*\n?\s*\?\s*'Template 名前 \(必須、最大 200 文字、何を生成するかが分かる名前\)'/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `iter613 invariant: tmpl-name 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter613 invariant: 破壊` })
  }

  console.log(`\n=== Findings (tmpl-child-title-aria-iter630) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
