/**
 * Phase 6.15 loop iter 634 (mode-D Desktop a11y) —
 * create-time-entry-form teMinutes number input aria-label を 3-state IIFE 動的化
 * (28 input 統一達成、分 → h+m 換算 expose)。
 *
 * 課題: create-time-entry-form.tsx 行 130-141 の teMinutes input は
 *   <Label htmlFor="teMinutes" "分"> のみで current 値 / 範囲が aria 側で
 *   expose されない。aria-invalid は durationMinutes <= 0 のみで >24h check 漏れ。
 *
 * fix (1 ファイル ~12 行差分、IIFE 3-state):
 *   - 不正 (≤0): `分 (1 以上、最大 1440 = 24h、現在値 ${val} は不正)`
 *   - 範囲外 (>1440): `分 (有効範囲 1-1440、現在値 ${val} は範囲外)`
 *   - 有効: `分 (現在 ${val} 分 = ${h}時間${m}分、step 15)` (h+m 換算 expose)
 *   - aria-invalid に > 24*60 check も追加
 *
 * iter633 tmpl-dod IIFE pattern を teMinutes に展開、saikyo-todo 内 動的
 * aria-label が 28 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-633 invariant cross-check。
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

  // 1. IIFE 動的化
  if (
    /aria-label=\{\(\(\) => \{\s*\n?\s*if \(durationMinutes <= 0\)\s*\n?\s*return `分 \(1 以上、最大 1440 = 24h、現在値 \$\{durationMinutes\} は不正\)`/.test(
      ctef,
    )
  ) {
    findings.push({ level: 'info', message: `teMinutes IIFE 動的化 OK` })
  } else {
    findings.push({ level: 'warning', message: `teMinutes IIFE 動的化なし` })
  }

  // 2. 範囲外 hint
  if (
    /if \(durationMinutes > 24 \* 60\)\s*\n?\s*return `分 \(有効範囲 1-1440、現在値 \$\{durationMinutes\} は範囲外\)`/.test(
      ctef,
    )
  ) {
    findings.push({ level: 'info', message: `teMinutes 範囲外 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `teMinutes 範囲外 hint なし` })
  }

  // 3. 有効値 h+m 換算 expose
  if (/return `分 \(現在 \$\{durationMinutes\} 分 = \$\{hm\}、step 15\)`/.test(ctef)) {
    findings.push({ level: 'info', message: `teMinutes h+m 換算 expose OK` })
  } else {
    findings.push({ level: 'warning', message: `teMinutes h+m 換算 expose なし` })
  }

  // 4. aria-invalid に > 24*60 check 追加
  if (
    /aria-invalid=\{durationMinutes <= 0 \|\| durationMinutes > 24 \* 60 \|\| undefined\}/.test(
      ctef,
    )
  ) {
    findings.push({ level: 'info', message: `teMinutes aria-invalid 拡張 OK` })
  } else {
    findings.push({ level: 'warning', message: `teMinutes aria-invalid 拡張なし` })
  }

  // 5. iter633 invariant: tmpl-dod 維持
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

  // 6. iter614 invariant: teDescription 4-state 維持
  if (
    /description\.length === 0\s*\n?\s*\?\s*'作業内容 \(必須、最大 500 文字、何をやったかを 1 行で\)'/.test(
      ctef,
    )
  ) {
    findings.push({ level: 'info', message: `iter614 invariant: teDescription 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter614 invariant: 破壊` })
  }

  console.log(`\n=== Findings (te-minutes-aria-iter634) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
