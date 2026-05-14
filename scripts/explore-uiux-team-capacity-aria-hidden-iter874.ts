/**
 * Phase 6.15 loop iter 874 (mode-D Desktop a11y) —
 * team-capacity-panel メンバー行 3 visible (member 名 / 今日 load / 今週 load) を
 * aria-hidden span で wrap.
 *
 * 課題: src/components/workspace/team-capacity-panel.tsx の メンバー行 (行 151-167) は
 * 3 visible div に各々 aria-label が完全 content を含むのに、内側 visible {name} /
 * 今日 + load / 今週 + load は aria-hidden 無し → SR ユーザに重複読み上げ。
 * iter844-873 sweep の続編で 3 callsite 一括対応、Team capacity 一覧の SR 経路整合性向上。
 *
 * fix (1 ファイル ~6 行差分、3 callsite):
 *   - {name} を <span aria-hidden="true"> で wrap
 *   - 今日 / 今週 + load の内側 visible を <span aria-hidden="true"> で wrap (2 spot)
 *   - 既存 aria-label / TONE_CLASS / data-testid 維持
 *
 * 検証: source-side regex assert + iter735-873 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tcp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )

  // 1. {name} 内 aria-hidden span
  if (/<span aria-hidden="true">\{name\}<\/span>/.test(tcp)) {
    findings.push({
      level: 'info',
      message: `team-capacity {name} visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `team-capacity {name} visible aria-hidden 未統合` })
  }

  // 2. 今日 load 内 aria-hidden span
  if (
    /<span aria-hidden="true">\n\s+<span className="text-muted-foreground mr-1">今日<\/span>\n\s+\{formatMemberCapacityLoadJa\(today\)\}\n\s+<\/span>/.test(
      tcp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `team-capacity 今日 load visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `team-capacity 今日 load visible aria-hidden 未統合`,
    })
  }

  // 3. 今週 load 内 aria-hidden span
  if (
    /<span aria-hidden="true">\n\s+<span className="text-muted-foreground mr-1">今週<\/span>\n\s+\{formatMemberCapacityLoadJa\(week\)\}\n\s+<\/span>/.test(
      tcp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `team-capacity 今週 load visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `team-capacity 今週 load visible aria-hidden 未統合`,
    })
  }

  // 4. aria-label 維持
  const ariaLabels = [
    /aria-label=\{`member: \$\{name\}`\}/.test(tcp),
    /aria-label=\{`今日: \$\{formatMemberCapacityLoadJa\(today\)\}`\}/.test(tcp),
    /aria-label=\{`今週: \$\{formatMemberCapacityLoadJa\(week\)\}`\}/.test(tcp),
  ]
  if (ariaLabels.every(Boolean)) {
    findings.push({
      level: 'info',
      message: `team-capacity 3 aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `team-capacity aria-label regression (${ariaLabels.filter(Boolean).length}/3)`,
    })
  }

  // 5. iter873 invariant: budget-panel 3 aria-hidden
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">上限を変更<\/span>/.test(bp) &&
    /<span aria-hidden="true">\s*\{update\.isPending \? '保存中…' : '保存'\}\s*<\/span>/.test(bp)
  ) {
    findings.push({
      level: 'info',
      message: `iter873 invariant: budget-panel aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter873 invariant: 破壊` })
  }

  // 6. iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (team-capacity-aria-hidden-iter874) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
