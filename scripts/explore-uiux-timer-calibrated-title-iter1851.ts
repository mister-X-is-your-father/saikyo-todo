/**
 * Phase 6.15 loop iter1851: active-timer-estimate-calibrated chip に title 付与
 * (iter1849 unreadBreakdown / iter1847 hint chip と同 pattern を calibrated chip にも展開、
 * calibration factor / delta context を sighted hover で disclose)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/active-timer-panel.tsx の calibrated chip は visible
 *   "→ ${calibratedMinutes}分" のみ + aria-label `${calibratedMinutes}分 — 校正後 +/-X分、
 *   中央値 Y× 補正` で full context を SR 提供だが、sighted は hover で calibration factor /
 *   delta 即把握できなかった。
 *
 * 修正 (src/components/workspace/active-timer-panel.tsx, 1 line 追加 + 2 line comment 追加):
 *   <span role="img"> に `title={同 aria-label}` 付与。
 *
 * 実行: pnpm tsx scripts/explore-uiux-timer-calibrated-title-iter1851.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))

  const panel = readFileSync(
    resolve(here, '../src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )

  // --- 1. calibrated chip title 付与済 ---
  if (
    !panel.includes(
      "title={`${calibrated.calibratedMinutes}分 — 校正後 ${calibrated.deltaMinutes > 0 ? '+' : ''}${calibrated.deltaMinutes}分、中央値 ${calibrationFactor?.toFixed(2)}× 補正`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'active-timer-estimate-calibrated title が無い',
    })
  }

  // --- 2. iter1849 unreadBreakdown title 維持 ---
  const bell = readFileSync(
    resolve(here, '../src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (!bell.includes('title={`${unreadBreakdown} — 未読内訳`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1849 unreadBreakdown title が消えている',
    })
  }

  // --- 3. iter1843 MustBadge title 維持 ---
  const mustBadge = readFileSync(
    resolve(here, '../src/components/workspace/must-badge.tsx'),
    'utf8',
  )
  if (!mustBadge.includes('title="MUST タスク"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1843 MustBadge title が消えている',
    })
  }

  // --- 4. iter1793 active-timer pause title 維持 ---
  if (!panel.includes('title="一時停止 — タイマーを一時停止"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1793 active-timer pause title が消えている',
    })
  }

  // --- 5. iter1841 StatusBadge title 維持 ---
  const statusBadge = readFileSync(
    resolve(here, '../src/components/workspace/status-badge.tsx'),
    'utf8',
  )
  if (!statusBadge.includes('title={`${cfg.shortLabel} — ステータス ${cfg.label}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1841 StatusBadge title が消えている',
    })
  }

  // --- 6. iter1799 create-workspace title 維持 ---
  const createWs = readFileSync(
    resolve(here, '../src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if (
    !createWs.includes(
      "title={isPending ? '作成中… — Workspace を作成中' : '作成 — Workspace を新規作成'}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1799 create-workspace title が消えている',
    })
  }

  // --- 7. iter1777 view-switcher Today title 維持 ---
  const board = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')
  if (!board.includes('title="Today — 今日のタスク優先順、scheduledFor=今日 + 期限近接"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1777 view-switcher Today title が消えている',
    })
  }

  // --- 8. iter1764 notification-bell trigger title 維持 ---
  if (!bell.includes('title={`通知 — 未読 ${unreadCount} 件`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1764 notification-bell trigger title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — calibrated chip に title 付与で calibration context sighted hover disclose、iter1849-1764 invariant 不変',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
