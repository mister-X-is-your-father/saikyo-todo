/**
 * Phase 6.15 loop iter 495 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * PersonalPeriodView ゴール保存 button + TeamContextEditor 保存 button を 44x44 化、codify。
 *
 * 課題: 2 form の save button が `size="sm"` (h-8 = 32px) で `className="min-h-11"` 漏れ。
 *   両方とも Cmd/Ctrl+Enter shortcut + aria-keyshortcuts + aria-busy + aria-label を持つ
 *   高品質 form save button だが、tap target だけ 32px で WCAG 2.5.5 AAA 違反。
 *
 *   - src/components/workspace/personal-period-view.tsx 行 175: ゴール保存 button
 *   - src/components/workspace/team-context-editor.tsx 行 91: チームコンテキスト 保存 button
 *
 *   両方とも form footer の primary action で頻繁に tap される。32px は親 textarea
 *   (rows=3-4) と垂直に並ぶため誤タップ起きやすい。
 *
 * fix (2 ファイル ~2 行追加):
 *   - 両 Button の `<Button type="button" size="sm" ...>` に `className="min-h-11"` 挿入
 *
 * 累計 **124 button mobile target 達成** (iter460-495 で 29 fix iter、+2 件)。
 * 機能不変、aria-* 属性すべて維持、shadcn 編集なし。
 *
 * 検証: source-side regex assert 2 file。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. PersonalPeriodView
  const ppPath = 'src/components/workspace/personal-period-view.tsx'
  const ppSrc = readFileSync(resolve(process.cwd(), ppPath), 'utf8')
  if (
    /<Button\s+type="button"\s+size="sm"\s+className="min-h-11"\s+disabled=\{!dirty \|\| upsertGoal\.isPending\}/.test(
      ppSrc,
    )
  ) {
    findings.push({ level: 'info', message: `${ppPath}: ゴール保存 Button min-h-11 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${ppPath}: ゴール保存 Button min-h-11 配線 不在` })
  }

  if (
    /aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(ppSrc) &&
    /data-testid=\{`period-goal-save-\$\{period\}`\}/.test(ppSrc)
  ) {
    findings.push({
      level: 'info',
      message: `${ppPath}: aria-keyshortcuts + data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${ppPath}: aria-keyshortcuts / data-testid 破壊` })
  }

  // 2. TeamContextEditor
  const tcePath = 'src/components/workspace/team-context-editor.tsx'
  const tceSrc = readFileSync(resolve(process.cwd(), tcePath), 'utf8')
  if (
    /<Button\s+type="button"\s+size="sm"\s+className="min-h-11"\s+disabled=\{!dirty \|\| upd\.isPending\}/.test(
      tceSrc,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${tcePath}: チームコンテキスト 保存 Button min-h-11 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${tcePath}: チームコンテキスト 保存 Button min-h-11 配線 不在`,
    })
  }

  if (
    /aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(tceSrc) &&
    /data-testid="team-context-save-btn"/.test(tceSrc)
  ) {
    findings.push({
      level: 'info',
      message: `${tcePath}: aria-keyshortcuts + data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${tcePath}: aria-keyshortcuts / data-testid 破壊`,
    })
  }

  // 3. 両 file で旧 size="sm" without min-h-11 が消えている
  if (!/size="sm"\s+disabled=\{!dirty \|\| upsertGoal\.isPending\}/.test(ppSrc)) {
    findings.push({
      level: 'info',
      message: `${ppPath}: 旧 size=sm without min-h-11 が消えている OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${ppPath}: 旧 size=sm without min-h-11 残存` })
  }
  if (!/size="sm"\s+disabled=\{!dirty \|\| upd\.isPending\}/.test(tceSrc)) {
    findings.push({
      level: 'info',
      message: `${tcePath}: 旧 size=sm without min-h-11 が消えている OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${tcePath}: 旧 size=sm without min-h-11 残存` })
  }

  console.log(`\n=== Findings (period-team-save-min-h-iter495) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
