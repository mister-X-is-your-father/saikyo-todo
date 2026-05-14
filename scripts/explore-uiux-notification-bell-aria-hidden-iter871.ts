/**
 * Phase 6.15 loop iter 871 (mode-D Desktop a11y) —
 * notification-bell 全て既読 button + notification item <p> visible body を
 * aria-hidden span/attr で wrap.
 *
 * 課題: src/components/workspace/notification-bell.tsx:
 *   - 全て既読 button (行 203): visible "全て既読", aria-label 動的 (4 state)
 *   - notification item <p> 内 visible body (行 247-256): button aria-label 完全 content
 *     ({readAt ? '既読' : '未読'} + type + body) を含むのに、内側 visible (未読 dot + body) は重複
 * 各々 親 aria-label が完全 content を持つのに、内側 visible は aria-hidden 無し → SR ユーザに重複読み上げ。
 * iter844-870 sweep の続編で 2 callsite 一括対応、Notification bell の SR 経路整合性向上。
 *
 * fix (1 ファイル ~2 行差分):
 *   - 全て既読 visible を <span aria-hidden="true"> で wrap
 *   - <p>{未読 dot + body}</p> に aria-hidden="true" 追加
 *   - 既存 CheckCheck icon aria-hidden / button aria-label 維持
 *
 * 検証: source-side regex assert + iter735-870 invariant cross-check。
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

  // 1. 全て既読 button visible
  if (/<span aria-hidden="true">全て既読<\/span>/.test(nb)) {
    findings.push({
      level: 'info',
      message: `notification-mark-all-read visible "全て既読" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-mark-all-read visible aria-hidden 未統合`,
    })
  }

  // 2. notification item <p aria-hidden> 追加
  if (/<p className="text-xs leading-snug" aria-hidden="true">/.test(nb)) {
    findings.push({
      level: 'info',
      message: `notification item visible <p> aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification item visible <p> aria-hidden 未統合`,
    })
  }

  // 3. button aria-label 維持
  const ariaLabels = [
    /aria-label=\{[\s\S]+?`未読 \$\{unreadCount\} 件をすべて既読にする`/.test(nb),
    /aria-label=\{`\$\{n\.readAt \? '既読' : '未読'\}\$\{visual\.label\}通知: \$\{formatNotificationBody\(n\)\}`\}/.test(
      nb,
    ),
  ]
  if (ariaLabels.every(Boolean)) {
    findings.push({
      level: 'info',
      message: `notification-bell 2 aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-bell aria-label regression (${ariaLabels.filter(Boolean).length}/2)`,
    })
  }

  // 4. iter870 invariant: schedule-picker 3 visible aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">割込みとして追加<\/span>/.test(sp) &&
    /<span aria-hidden="true">キャンセル<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter870 invariant: schedule-picker aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter870 invariant: 破壊` })
  }

  // 5. iter735 invariant
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

  console.log(`\n=== Findings (notification-bell-aria-hidden-iter871) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
