/**
 * Phase 6.15 loop iter 561 (mode-D Desktop a11y) —
 * SprintRetroWidget 差分 (delta) <dd> に aria-label を補完 (色のみで意味伝達 防止)。
 *
 * 課題: sprint-retro-widget.tsx 行 126-133 の差分 <dd> は色 (rose=未達 / emerald=超過達成 /
 *   無色=差分なし) で tone を示すが SR ユーザに色情報が届かない。WCAG 1.4.1
 *   (色のみで意味を伝達してはならない) 違反。
 *
 * fix (1 ファイル ~7 行差分):
 *   - aria-label を delta 値で動的に切替:
 *     - delta < 0: `納品 - 計画 {delta} 件 (未達)`
 *     - delta > 0: `納品 - 計画 +{delta} 件 (超過達成)`
 *     - delta === 0: '納品 = 計画 (差分なし)'
 *
 * +7 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、className / 視覚 tone (rose /
 * emerald) invariant 維持。これで色 + text + aria-label の 3 経路で SR / 色覚異常者にも
 * 意味が伝わる。
 *
 * 検証: source-side regex assert + iter515-560 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const srw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )

  // 1. 差分 <dd> aria-label 動的化
  if (
    /aria-label=\{[\s\S]*?delta < 0[\s\S]*?`納品 - 計画 \$\{delta\} 件 \(未達\)`[\s\S]*?delta > 0[\s\S]*?`納品 - 計画 \+\$\{delta\} 件 \(超過達成\)`[\s\S]*?'納品 = 計画 \(差分なし\)'/.test(
      srw,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-retro-widget.tsx: 差分 <dd> aria-label 3 状態 (未達 / 超過達成 / 差分なし) 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-retro-widget.tsx: 差分 <dd> aria-label 配線 不在`,
    })
  }

  // 2. 既存 className tone (rose / emerald) 維持
  if (/text-rose-700/.test(srw) && /text-emerald-700/.test(srw) && /tabular-nums/.test(srw)) {
    findings.push({
      level: 'info',
      message: `sprint-retro-widget.tsx: 既存 className tone (rose / emerald / tabular-nums) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-retro-widget.tsx: 既存 className 破壊`,
    })
  }

  // 3. iter560 invariant: theme-toggle aria-label 動的化 維持
  const tt = readFileSync(resolve(process.cwd(), 'src/components/shared/theme-toggle.tsx'), 'utf8')
  if (
    /aria-label=\{\s*resolvedTheme === 'dark' \? 'ライトテーマに切替' : 'ダークテーマに切替'\s*\}/.test(
      tt,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter560 invariant: theme-toggle aria-label 動的 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter560 invariant: 破壊`,
    })
  }

  // 4. iter515 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (retro-delta-aria-iter561) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
