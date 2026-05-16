/**
 * Phase 6.15 loop iter 876 (mode-D Desktop a11y) —
 * notification-bell の通知 item button 内 visible content (body 文 + 未読 dot +
 * 相対時刻) を aria-hidden 化、time 要素は aria-label で context-rich 化。
 *
 * 経緯: iter854 で notification-bell mark-all-read button 修正済の続編。
 *   通知 item button (line 230-268) は aria-label に
 *   `${readAt ? '既読' : '未読'}${visual.label}通知: ${formatNotificationBody(n)}`
 *   を持つが、内部 visible content (body text / 未読 dot / 時刻) も SR が読み上げ
 *   → body 重複読み上げ + 未読 dot の "未読" 重複 + 時刻 fallback 読み。
 *
 * 修正:
 *   1. visible body <p> を aria-hidden 化 (aria-label 完全 content)
 *   2. 未読 dot の role="img" + aria-label="未読" を削除 (button aria-label に既に含まれる)
 *   3. <time> に aria-label="${formatRelativeTime} (${ISO})" を追加し、内側 visible は span aria-hidden 化
 *
 * 検証: source-side regex assert + iter735/843/849-875 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )

  // 1. visible body <p> aria-hidden
  if (/<p className="text-xs leading-snug" aria-hidden="true">/.test(nb)) {
    findings.push({
      level: 'info',
      message: `notification-bell item body <p> aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-bell item body <p> aria-hidden 未統合`,
    })
  }

  // 2. 未読 dot role="img" / aria-label="未読" 削除確認 (button aria-label 単独経路)
  if (
    !/role="img"\s+aria-label="未読"/.test(nb) &&
    /bg-primary mr-1 inline-block h-1\.5 w-1\.5/.test(nb)
  ) {
    findings.push({
      level: 'info',
      message: `notification-bell 未読 dot decorative span 化 OK (button aria-label 単独経路)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-bell 未読 dot 重複 aria-label 残存`,
    })
  }

  // 3. time aria-label + visible span aria-hidden
  if (
    /aria-label=\{`\$\{formatRelativeTime\(n\.createdAt\)\} \(\$\{n\.createdAt instanceof Date \? n\.createdAt\.toISOString\(\) : new Date\(n\.createdAt\)\.toISOString\(\)\}\)`\}/.test(
      nb,
    ) &&
    /<span aria-hidden="true">\{formatRelativeTime\(n\.createdAt\)\}<\/span>/.test(nb)
  ) {
    findings.push({
      level: 'info',
      message: `notification-bell <time> aria-label + 内側 span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-bell <time> aria-label / span aria-hidden 未統合`,
    })
  }

  // 4. button aria-label 維持 (既読/未読 + visual.label + body)
  if (
    /aria-label=\{`\$\{n\.readAt \? '既読' : '未読'\}\$\{visual\.label\}通知: \$\{formatNotificationBody\(n\)\}`\}/.test(
      nb,
    )
  ) {
    findings.push({
      level: 'info',
      message: `notification-bell item button aria-label 完全 content 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-bell item button aria-label 破壊`,
    })
  }

  // iter854 invariant: mark-all-read aria-hidden
  if (/<span aria-hidden="true">全て既読<\/span>/.test(nb)) {
    findings.push({
      level: 'info',
      message: `iter854 invariant: notification-bell mark-all-read aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter854 invariant: 破壊` })
  }

  // iter875 invariant: gantt-view inline MUST badge
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /<span[\s\S]+?role="img"[\s\S]+?aria-label="MUST タスク"[\s\S]+?>\s*<span aria-hidden="true">MUST<\/span>/.test(
      gv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter875 invariant: gantt-view inline MUST badge aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter875 invariant: 破壊` })
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

  console.log(`\n=== Findings (notification-item-content-aria-hidden-iter876) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
