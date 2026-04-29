/**
 * Phase 6.15 loop iter 294 — gantt-view.tsx の aria-label に英語ノイズが
 * 残っており、JP locale (html lang="ja") と不一致な問題。
 *
 * 現状 (修正前):
 *   1. line 464: `aria-label="MUST item"` — `must-badge.tsx` line 15
 *      comment が「旧 aria-label="MUST item" (英) と "MUST タスク" (和) が
 *      混在してたので "MUST タスク" に統一済」と記載しているが、
 *      gantt-view.tsx 内の inline span は同統一に追従していない孤立。
 *   2. line 474: `aria-label="baseline ${start} → ${end}"` — "baseline" は
 *      project mgmt の技術用語だが、app 全体は「ベースライン」(katakana)
 *      表記を使う JP UI なので英語残留はノイズ。
 *
 * SR で gantt の MUST badge を focus すると "MUST item" と英語 announce、
 * baseline 線を Tab でスキップする際に "baseline 2024-01-01 → 2024-02-01"
 * と英語フレーズが混入。WCAG 3.1.2 (Language of Parts, Level AA) 適合性
 * 低下、JP locale 体験の一貫性低下。
 *
 * 期待 (fix 後):
 *   1. `aria-label="MUST タスク"` — must-badge.tsx と整合
 *   2. `aria-label={`ベースライン ${start} → ${end}`}` — JP 表記
 *
 * Supabase 不要 (source 側 regex assert)。gantt-view は workspace 認証
 * 必須画面のため runtime 検証は環境依存。
 *
 *   pnpm tsx scripts/explore-uiux-gantt-aria-localize-iter294.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const src = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'),
    'utf8',
  )

  // 1. "MUST item" 英語 aria-label が残っていない
  if (/aria-label="MUST item"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `gantt-view.tsx: aria-label="MUST item" が残存 (英語ノイズ、"MUST タスク" 期待)`,
    })
  } else {
    findings.push({ level: 'info', message: `MUST item 英語 aria-label の残存無し` })
  }

  // 2. "MUST タスク" に統一されている
  if (!/aria-label="MUST タスク"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `gantt-view.tsx: aria-label="MUST タスク" が見つからない (must-badge.tsx と整合する目標)`,
    })
  } else {
    findings.push({ level: 'info', message: `MUST タスク aria-label OK` })
  }

  // 3. "baseline " 英語 aria-label が残っていない (テンプレ literal)
  if (/aria-label=\{`baseline /.test(src)) {
    findings.push({
      level: 'warning',
      message: `gantt-view.tsx: aria-label baseline 英語残存 ("ベースライン" 期待)`,
    })
  } else {
    findings.push({ level: 'info', message: `baseline 英語 aria-label の残存無し` })
  }

  // 4. "ベースライン" に置換されている
  if (!/aria-label=\{`ベースライン /.test(src)) {
    findings.push({
      level: 'warning',
      message: `gantt-view.tsx: aria-label "ベースライン" template が見つからない`,
    })
  } else {
    findings.push({ level: 'info', message: `ベースライン aria-label OK` })
  }

  console.log(`\n=== Findings (gantt-aria-localize-iter294) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
