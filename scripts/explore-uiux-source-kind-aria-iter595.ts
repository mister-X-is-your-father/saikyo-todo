/**
 * Phase 6.15 loop iter 595 (mode-D Desktop a11y) —
 * integrations-panel src-kind <select> 動的 aria-label + 効果説明補強。
 *
 * 課題: integrations-panel.tsx 行 320-330 の src-kind <select> は aria-label が
 *   "Source 種別" の static で current value (custom-rest/yamory) が expose
 *   されない。option text "(汎用 REST)" / "(脆弱性管理)" は短く、初見ユーザは
 *   「custom-rest と yamory の使い分け」 を visible/AT で読み取り辛い。
 *
 * fix (1 ファイル ~9 行差分):
 *   - aria-label 動的 template literal 化 + 効果説明補強
 *     - 'custom-rest' → 'custom-rest — 汎用 REST API、URL / メソッド / items path を自由設定'
 *     - 'yamory'      → 'yamory — 脆弱性管理 SaaS の専用コネクタ'
 *     - 未知 → raw fallback で破綻防止
 *
 * iter587/588/589/590/591/592/593/594 (動的 aria-label expose / i18n 整合)
 * pattern を integrations-panel src-kind に水平展開。
 *
 * 検証: source-side regex assert + iter515-594 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )

  // 1. kind 'custom-rest' → 'custom-rest — 汎用 REST API、URL / メソッド / items path を自由設定'
  if (
    /kind === 'custom-rest'\s*\n?\s*\?\s*'custom-rest — 汎用 REST API、URL \/ メソッド \/ items path を自由設定'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `kind 'custom-rest' → 効果説明 OK` })
  } else {
    findings.push({ level: 'warning', message: `kind 'custom-rest' 変換なし` })
  }

  // 2. kind 'yamory' → 'yamory — 脆弱性管理 SaaS の専用コネクタ'
  if (/kind === 'yamory'\s*\n?\s*\?\s*'yamory — 脆弱性管理 SaaS の専用コネクタ'/.test(ip)) {
    findings.push({ level: 'info', message: `kind 'yamory' → 効果説明 OK` })
  } else {
    findings.push({ level: 'warning', message: `kind 'yamory' 変換なし` })
  }

  // 3. aria-label 動的 template literal
  if (/aria-label=\{`Source 種別 \(現在: \$\{/.test(ip)) {
    findings.push({ level: 'info', message: `aria-label 動的 template literal OK` })
  } else {
    findings.push({ level: 'warning', message: `aria-label 動的化なし` })
  }

  // 4. iter594 invariant: dep-target option statusJa 維持
  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (/const statusJa = getStatusVisual\(c\.status\)\.shortLabel/.test(idp)) {
    findings.push({ level: 'info', message: `iter594 invariant: dep-target statusJa 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter594 invariant: 破壊` })
  }

  // 5. iter593 invariant: dep-kind aria-label 維持
  if (/aria-label=\{`依存の種類 \(現在: \$\{/.test(idp)) {
    findings.push({ level: 'info', message: `iter593 invariant: dep-kind 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter593 invariant: 破壊` })
  }

  // 6. iter591 invariant: gantt zoom aria-label 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/aria-label=\{`Gantt の 1 日あたりの幅 \(現在: \$\{/.test(gv)) {
    findings.push({ level: 'info', message: `iter591 invariant: gantt zoom 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter591 invariant: 破壊` })
  }

  // 7. iter589 invariant: status filter aria-label 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/statusFilter === 'todo'\s*\n?\s*\?\s*'TODO'/.test(ib)) {
    findings.push({ level: 'info', message: `iter589 invariant: status filter 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter589 invariant: 破壊` })
  }

  console.log(`\n=== Findings (source-kind-aria-iter595) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
