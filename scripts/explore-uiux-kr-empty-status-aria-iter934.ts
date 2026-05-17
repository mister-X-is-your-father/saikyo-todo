/**
 * Phase 6.15 loop iter 934 (mode-D Desktop a11y) —
 * goals-panel KrCard 内 KR 空状態 <p> に role="status" + aria-live="polite" + data-testid 追加、
 * 他 empty state (gantt-view / archived-items / item-dependencies / activity-log /
 * sprints-panel 等 7+ 件) と一貫化。
 *
 * 経緯: 既存 empty state は `role="status" aria-live="polite"` を統一使用しているが、
 *   KrCard の 「KR がありません」 plain `<p>` のみ role 抜け → SR landmark / status
 *   region nav で検出しにくく、空状態の announce が起きない。
 *
 * 修正 (+6/-1 行、1 file):
 *   - <p> に role="status" + aria-live="polite" + data-testid={`krs-empty-${goalId}`} 追加
 *   - 視覚 styling / message text 不変
 *
 * 検証: source-side regex assert + iter735/933 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // 1. KR empty p に role="status" + aria-live="polite" + data-testid 追加 OK
  if (
    /role="status"\s*\n\s*aria-live="polite"\s*\n\s*data-testid=\{`krs-empty-\$\{goalId\}`\}\s*\n\s*>\s*KR がありません/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `goals-panel KR empty p role/aria-live/data-testid 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel KR empty p role/aria-live 欠落`,
    })
  }

  // 2. message text 維持
  if (/KR がありません。下のフォームから追加。/.test(gp)) {
    findings.push({
      level: 'info',
      message: `goals-panel KR empty message text 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel KR empty message text 破壊`,
    })
  }

  // iter933 invariant: retro-comparison div role="group"
  const srw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )
  if (/data-testid="retro-comparison"\s*\n\s*role="group"/.test(srw)) {
    findings.push({
      level: 'info',
      message: `iter933 invariant: retro-comparison role="group" 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter933 invariant: 破壊` })
  }

  // iter735 invariant
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

  console.log(`\n=== Findings (kr-empty-status-aria-iter934) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
