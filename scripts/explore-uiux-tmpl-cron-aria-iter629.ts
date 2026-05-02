/**
 * Phase 6.15 loop iter 629 (mode-D Desktop a11y) —
 * templates-panel tmpl-cron IMEInput aria-label を 2-state 動的化
 * (23 input 統一達成、cron 形式 hint)。
 *
 * 課題: templates-panel.tsx 行 170-179 の tmpl-cron IMEInput は <Label htmlFor>
 *   のみで文字数 / 形式が aria 側で expose されない。
 *
 * fix (1 ファイル ~5 行差分):
 *   - aria-label 2-state 動的化:
 *     - 空欄: 'cron 式 (任意、5 フィールド標準 cron 形式 — 例: 「0 9 * * 1」 で毎週月曜 09:00)'
 *     - 通常: `cron 式 (現在 ${length} 文字、5 フィールド標準形式)`
 *
 * iter628 src-id-path / src-title-path pattern を tmpl-cron に展開、saikyo-todo
 * 内 動的 aria-label が 23 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-628 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )

  // 1. 空欄 hint
  if (
    /scheduleCron\.length === 0\s*\n?\s*\?\s*'cron 式 \(任意、5 フィールド標準 cron 形式 — 例: 「0 9 \* \* 1」 で毎週月曜 09:00\)'/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `tmpl-cron 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `tmpl-cron 空欄 hint なし` })
  }

  // 2. 通常 hint
  if (/:\s*`cron 式 \(現在 \$\{scheduleCron\.length\} 文字、5 フィールド標準形式\)`/.test(tp)) {
    findings.push({ level: 'info', message: `tmpl-cron 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `tmpl-cron 通常 hint なし` })
  }

  // 3. iter628 invariant: src-id-path 維持
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

  // 4. iter621 invariant: tmpl-desc 維持
  if (
    /description\.length === 0\s*\n?\s*\?\s*'Template の説明 \(任意、このテンプレートが何を生成するか/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `iter621 invariant: tmpl-desc 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter621 invariant: 破壊` })
  }

  // 5. iter613 invariant: tmpl-name 4-state 維持
  if (
    /name\.length === 0\s*\n?\s*\?\s*'Template 名前 \(必須、最大 200 文字、何を生成するかが分かる名前\)'/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `iter613 invariant: tmpl-name 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter613 invariant: 破壊` })
  }

  // 6. iter608 invariant: tmpl-kind 維持
  if (/aria-label=\{`Template 種別 \(現在: \$\{/.test(tp)) {
    findings.push({ level: 'info', message: `iter608 invariant: tmpl-kind 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter608 invariant: 破壊` })
  }

  console.log(`\n=== Findings (tmpl-cron-aria-iter629) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
