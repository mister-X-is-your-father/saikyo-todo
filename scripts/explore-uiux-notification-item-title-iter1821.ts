/**
 * Phase 6.15 loop iter1821: notification-bell notification-item button に title 付与
 * (iter1807 mark-all-read と pair で notification-bell 全 button hover disclosure 完備)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/notification-bell.tsx line 265-282 の notification-item button
 *   は aria-label `${body} — ${status}${visual.label}通知 — ${relativeTime}` で notification 全体
 *   context を SR 提供だが sighted は hover で body/status/time 即把握できなかった (icon-only
 *   ではないが内部 span は aria-hidden で body は accessible name 経路のみ)。
 *
 * 修正 (src/components/workspace/notification-bell.tsx, 1 line 追加 + 3 line comment 追加):
 *   <button> に `title={同 aria-label}` 付与。aria-label / onClick / data-testid /
 *   data-notification-type 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-notification-item-title-iter1821.ts
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

  const bell = readFileSync(
    resolve(here, '../src/components/workspace/notification-bell.tsx'),
    'utf8',
  )

  // --- 1. notification-item title 付与済 ---
  if (
    !bell.includes(
      "title={`${formatNotificationBody(n)} — ${n.readAt ? '既読' : '未読'}${visual.label}通知 — ${formatRelativeTime(n.createdAt)}`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'notification-item title が無い',
    })
  }

  // --- 2. iter1807 mark-all-read title 維持 ---
  if (!bell.includes('`全て既読 — 未読 ${unreadCount} 件をすべて既読にする`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1807 mark-all-read default title が消えている',
    })
  }

  // --- 3. iter1764 notification-bell title 維持 ---
  if (!bell.includes('title={`通知 — 未読 ${unreadCount} 件`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1764 notification-bell title が消えている',
    })
  }

  // --- 4. notification-bell title 件数 >= 3 (bell + mark-all-read + notification-item) ---
  const titleCount = (bell.match(/\btitle=(\{|`)/g) ?? []).length
  if (titleCount < 3) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `notification-bell title 件数が ${titleCount} (期待 >= 3)`,
    })
  }

  // --- 5. iter1819 kr-add title 維持 ---
  const goalsPanel = readFileSync(
    resolve(here, '../src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (!goalsPanel.includes("'KR 追加 — Key Result をこの Goal に追加'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1819 kr-add default title が消えている',
    })
  }

  // --- 6. iter1815 src-* delete title 維持 ---
  const integrationsPanel = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (!integrationsPanel.includes('`削除 — Source「${src.name}」を削除`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1815 src-delete title が消えている',
    })
  }

  // --- 7. iter1799 create-workspace title 維持 ---
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

  // --- 8. iter1777 view-switcher Today title 維持 ---
  const board = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')
  if (!board.includes('title="Today — 今日のタスク優先順、scheduledFor=今日 + 期限近接"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1777 view-switcher Today title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — notification-item button に title 付与で notification-bell 全 button hover disclosure 完備、iter1819-1777 invariant 不変',
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
