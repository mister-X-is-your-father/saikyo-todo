/**
 * Phase 6.15 loop iter 635 (mode-D Desktop a11y) —
 * create-time-entry-form teCategory <select> aria-label に current label 埋込み
 * (29 input 統一達成、TIME_ENTRY_CATEGORIES helper 再利用)。
 *
 * 課題: create-time-entry-form.tsx 行 83-90 の teCategory <select> は
 *   <Label htmlFor> のみで current value が aria 側で expose されない。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label = `カテゴリ (現在: ${TIME_ENTRY_CATEGORIES.find(c => c.key === category)?.label ?? category})`
 *
 * iter595 src-kind / iter608 tmpl-kind pattern を teCategory に展開、saikyo-todo
 * 内 動的 aria-label が 29 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-634 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ctef = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )

  // 1. teCategory aria-label 動的化
  if (
    /aria-label=\{`カテゴリ \(現在: \$\{TIME_ENTRY_CATEGORIES\.find\(\(c\) => c\.key === category\)\?\.label \?\? category\}\)`\}/.test(
      ctef,
    )
  ) {
    findings.push({ level: 'info', message: `teCategory aria-label 動的化 OK` })
  } else {
    findings.push({ level: 'warning', message: `teCategory aria-label 動的化なし` })
  }

  // 2. iter634 invariant: teMinutes 維持
  if (
    /aria-invalid=\{durationMinutes <= 0 \|\| durationMinutes > 24 \* 60 \|\| undefined\}/.test(
      ctef,
    )
  ) {
    findings.push({ level: 'info', message: `iter634 invariant: teMinutes 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter634 invariant: 破壊` })
  }

  // 3. iter614 invariant: teDescription 維持
  if (
    /description\.length === 0\s*\n?\s*\?\s*'作業内容 \(必須、最大 500 文字、何をやったかを 1 行で\)'/.test(
      ctef,
    )
  ) {
    findings.push({ level: 'info', message: `iter614 invariant: teDescription 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter614 invariant: 破壊` })
  }

  // 4. iter633 invariant: tmpl-dod 維持
  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (
    /dod\.length === 0\s*\n?\s*\?\s*'DoD \(Definition of Done\) — MUST item の完了条件 \(必須、何があれば完了とみなすか\)'/.test(
      tie,
    )
  ) {
    findings.push({ level: 'info', message: `iter633 invariant: tmpl-dod 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter633 invariant: 破壊` })
  }

  // 5. iter608 invariant: tmpl-kind 維持
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`Template 種別 \(現在: \$\{/.test(tp)) {
    findings.push({ level: 'info', message: `iter608 invariant: tmpl-kind 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter608 invariant: 破壊` })
  }

  // 6. iter595 invariant: src-kind 維持
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`Source 種別 \(現在: \$\{/.test(ip)) {
    findings.push({ level: 'info', message: `iter595 invariant: src-kind 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter595 invariant: 破壊` })
  }

  console.log(`\n=== Findings (te-category-aria-iter635) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
