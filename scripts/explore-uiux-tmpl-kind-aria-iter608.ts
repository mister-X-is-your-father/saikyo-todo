/**
 * Phase 6.15 loop iter 608 (mode-D Desktop a11y) —
 * templates-panel tmpl-kind <select> 動的 aria-label + 効果説明補強。
 *
 * 課題: templates-panel.tsx 行 113-121 の tmpl-kind <select> は <Label htmlFor>
 *   による accessible name のみで current value (manual/recurring) と効果差
 *   (手動展開 vs cron 自動展開) が aria 側で expose されない。
 *
 * fix (1 ファイル ~7 行差分):
 *   - aria-label 動的化 + 効果説明補強:
 *     - 'manual' → 'manual — 手動展開のみ、ユーザが「展開」 button で生成'
 *     - 'recurring' → 'recurring — cron 式に従って worker が自動展開 (下記 cron 式を設定)'
 *     - 未知 → raw fallback で破綻防止
 *
 * iter587-607 (動的 aria-label expose / i18n 整合) pattern を tmpl-kind に水平展開。
 *
 * 検証: source-side regex assert + iter515-607 invariant cross-check。
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

  // 1. kind 'manual' → 'manual — 手動展開のみ、...'
  if (
    /kind === 'manual'\s*\n?\s*\?\s*'manual — 手動展開のみ、ユーザが「展開」 button で生成'/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `kind 'manual' → 効果説明 OK` })
  } else {
    findings.push({ level: 'warning', message: `kind 'manual' 変換なし` })
  }

  // 2. kind 'recurring' → 'recurring — cron 式に従って worker が自動展開 (下記 cron 式を設定)'
  if (
    /kind === 'recurring'\s*\n?\s*\?\s*'recurring — cron 式に従って worker が自動展開 \(下記 cron 式を設定\)'/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `kind 'recurring' → 効果説明 OK` })
  } else {
    findings.push({ level: 'warning', message: `kind 'recurring' 変換なし` })
  }

  // 3. aria-label 動的 template literal
  if (/aria-label=\{`Template 種別 \(現在: \$\{/.test(tp)) {
    findings.push({ level: 'info', message: `aria-label 動的 template literal OK` })
  } else {
    findings.push({ level: 'warning', message: `aria-label 動的化なし` })
  }

  // 4. iter607 invariant: budget-warn percent expose 維持
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (/:\s*`警告閾値 \(現在: \$\{Math\.round\(Number\(draftWarn\) \* 100\)\}%/.test(bp)) {
    findings.push({ level: 'info', message: `iter607 invariant: budget-warn percent 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter607 invariant: 破壊` })
  }

  // 5. iter605 invariant: sprint-defaults-dow 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`Sprint 基本曜日 \(現在: \$\{DOW_JA\[dow\] \?\? dow\}曜開始\)`\}/.test(sp)) {
    findings.push({ level: 'info', message: `iter605 invariant: sprint-defaults-dow 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter605 invariant: 破壊` })
  }

  // 6. iter595 invariant: src-kind aria-label 維持
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`Source 種別 \(現在: \$\{/.test(ip)) {
    findings.push({ level: 'info', message: `iter595 invariant: src-kind 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter595 invariant: 破壊` })
  }

  console.log(`\n=== Findings (tmpl-kind-aria-iter608) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
