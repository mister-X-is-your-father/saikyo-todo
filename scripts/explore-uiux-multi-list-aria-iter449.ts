/**
 * Phase 6.15 loop iter 449 (mode-D Desktop a11y) — 3 panel の `<ul>` に
 * aria-label を追加 (iter427 / iter428 / iter438 / iter447 / iter448 と同
 * pattern 連続 widget list heading 統一 10-12 件目水平展開)、codify。
 *
 * 課題: 3 file の `<ul>` で aria-label/aria-labelledby が無く、SR list nav で
 *   件数のみが伝わる:
 *   1. activity-log.tsx: `<ul data-testid="activity-log">` (audit log 一覧)
 *   2. integrations-panel.tsx: `<ul data-testid="sources-list">` (API 連携 source)
 *   3. decompose-proposals-panel.tsx: `<ul data-testid="proposals-list">` (AI 分解提案)
 *
 * fix: 3 ファイル × 各 1 行 = ~12 行差分 (各 <ul> に動的 count aria-label)。
 *   - activity-log: `aria-label="Activity 履歴 ${data.length} 件"`
 *   - integrations-panel: `aria-label="API 連携 source 一覧 ${list.data!.length} 件"`
 *   - decompose-proposals-panel: `aria-label="AI 分解提案 一覧 ${list.length} 件"`
 *
 * 機能追加なし、視覚 layout 不変、shadcn 編集なし。同一 pattern を 3 file で
 * 一気に適用したことで sweep 完了 (iter448 sprints-list と合わせて 4 件目)。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const TARGETS: { path: string; label: string; regex: RegExp }[] = [
    {
      path: 'src/components/workspace/activity-log.tsx',
      label: 'activity-log',
      regex: /aria-label=\{`Activity 履歴 \$\{data\.length\} 件`\}/,
    },
    {
      path: 'src/components/integrations/integrations-panel.tsx',
      label: 'integrations-panel',
      regex: /aria-label=\{`API 連携 source 一覧 \$\{list\.data!\.length\} 件`\}/,
    },
    {
      path: 'src/components/workspace/decompose-proposals-panel.tsx',
      label: 'decompose-proposals-panel',
      regex: /aria-label=\{`AI 分解提案 一覧 \$\{list\.length\} 件`\}/,
    },
  ]
  for (const t of TARGETS) {
    const s = readFileSync(resolve(process.cwd(), t.path), 'utf8')
    if (t.regex.test(s)) {
      findings.push({ level: 'info', message: `${t.label}: ul aria-label 配線 OK` })
    } else {
      findings.push({ level: 'warning', message: `${t.label}: ul aria-label 配線 不在` })
    }
  }

  // iter448 / iter447 invariants 維持
  const sprintsSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`Sprint 一覧 \$\{list\.data\.length\} 件`\}/.test(sprintsSrc)) {
    findings.push({ level: 'info', message: `sprints-panel: iter448 invariant 維持 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel: iter448 invariant 消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (multi-list-aria-iter449) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
