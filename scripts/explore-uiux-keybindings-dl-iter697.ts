/**
 * Phase 6.15 loop iter 697 (mode-D Desktop a11y) —
 * keybindings-help-modal dl に aria-labelledby 追加
 * (group h3 を直接 reference、SR ナビでグループ識別を明示化)。
 *
 * 課題: keybindings-help-modal.tsx 行 75 の `<dl>` (各グループのキーバインド一覧) は
 *   parent section に aria-labelledby が付与されているが、dl 単体は無 label。
 *   parent section の aria-labelledby を継承する SR は多いが、dl にも明示的に
 *   付与すると semantic association が強化される。
 *
 * fix (1 ファイル ~3 行差分):
 *   - dl に `aria-labelledby={headingId}`
 *
 * iter695 / iter696 (definition list 命名 sweep) と同 a11y 軸。
 *
 * 検証: source-side regex assert + iter515-696 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const km = readFileSync(
    resolve(process.cwd(), 'src/components/shared/keybindings-help-modal.tsx'),
    'utf8',
  )

  // 1. dl aria-labelledby
  if (
    /<dl\s*\n\s*className="grid grid-cols-\[auto_1fr\] gap-x-4 gap-y-2"\s*\n\s*aria-labelledby=\{headingId\}\s*\n\s*>/.test(
      km,
    )
  ) {
    findings.push({ level: 'info', message: `keybindings dl aria-labelledby OK` })
  } else {
    findings.push({ level: 'warning', message: `keybindings dl aria-labelledby なし` })
  }

  // 2. h3 headingId 既存維持
  if (/<h3\s*\n\s*id=\{headingId\}/.test(km)) {
    findings.push({ level: 'info', message: `h3 headingId 既存維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `h3 headingId 破壊` })
  }

  // 3. iter696 invariant: sprint-retro dl 維持
  const srw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )
  if (/aria-label="計画 vs 納品 \(計画 \/ 納品 \/ 差分\)"/.test(srw)) {
    findings.push({ level: 'info', message: `iter696 invariant: sprint-retro dl 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter696 invariant: 破壊` })
  }

  // 4. iter695 invariant: pdca dl 維持
  const cs = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (/aria-label="Lead time 統計 \(平均 \/ 中央 \/ 期間\)"/.test(cs)) {
    findings.push({ level: 'info', message: `iter695 invariant: pdca dl 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter695 invariant: 破壊` })
  }

  // 5. iter694 invariant: gantt critical chip 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/data-testid="gantt-summary-critical"/.test(gv)) {
    findings.push({ level: 'info', message: `iter694 invariant: gantt-summary-critical 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter694 invariant: 破壊` })
  }

  console.log(`\n=== Findings (keybindings-dl-iter697) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
