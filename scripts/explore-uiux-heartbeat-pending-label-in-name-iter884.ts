/**
 * Phase 6.15 loop iter 884 (mode-D Desktop a11y) —
 * heartbeat-button pending 状態の WCAG 2.5.3 (Label in Name) 違反を修正。
 *
 * 課題: src/components/workspace/heartbeat-button.tsx の heartbeat-btn:
 *   - normal: visible "Heartbeat" / aria-label "Heartbeat: MUST item の期限スキャンを..." → 適合 (iter834 で wrap 済)
 *   - pending: visible "スキャン中…" / 旧 aria-label "Heartbeat スキャンを実行中…" は visible "スキャン中…" の "スキャン" と "中" の間に "を実行" が挿入されて substring 不適合 → WCAG 2.5.3 違反
 *
 * fix (1 ファイル / +1-1 行差分):
 *   - aria-label pending を `スキャン中… (Heartbeat MUST item の期限スキャン実行中)` 形に変更し
 *     visible "スキャン中…" prefix 適合化
 *   - visible / aria-label normal は維持 (iter834 で対応済)
 *
 * 検証: source-side regex assert + iter882/883 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const hb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/heartbeat-button.tsx'),
    'utf8',
  )

  // 1. pending aria-label に visible "スキャン中…" prefix
  if (/'スキャン中… \(Heartbeat MUST item の期限スキャン実行中\)'/.test(hb)) {
    findings.push({
      level: 'info',
      message: `heartbeat-btn pending aria-label に visible "スキャン中…" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `heartbeat-btn pending aria-label が visible "スキャン中…" prefix 不含`,
    })
  }

  // 2. 旧 aria-label "Heartbeat スキャンを実行中…" 削除
  if (!/'Heartbeat スキャンを実行中…'/.test(hb)) {
    findings.push({
      level: 'info',
      message: `heartbeat-btn 旧 aria-label "Heartbeat スキャンを実行中…" 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `heartbeat-btn 旧 aria-label "Heartbeat スキャンを実行中…" 残存`,
    })
  }

  // 3. iter834 invariant: visible aria-hidden 維持
  if (
    /<span aria-hidden="true">\{scan\.isPending \? 'スキャン中…' : 'Heartbeat'\}<\/span>/.test(hb)
  ) {
    findings.push({
      level: 'info',
      message: `iter834 invariant: heartbeat-btn visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter834 invariant: heartbeat-btn 破壊` })
  }

  // 4. normal aria-label 維持
  if (
    /'Heartbeat: MUST item の期限スキャンを手動実行 \(7d \/ 3d \/ 1d \/ overdue 段階で通知を作成\)'/.test(
      hb,
    )
  ) {
    findings.push({
      level: 'info',
      message: `heartbeat-btn normal aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `heartbeat-btn normal aria-label 破壊` })
  }

  // iter883 invariant: subtasks-bulk-add aria-label
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (
    /`\$\{pendingTitleCount\} 件追加 \(子タスクをまとめて追加、Cmd\/Ctrl\+Enter でも可\)`/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter883 invariant: subtasks-bulk-add aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter883 invariant: subtasks-bulk-add 破壊` })
  }

  console.log(`\n=== Findings (heartbeat-pending-label-in-name-iter884) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
