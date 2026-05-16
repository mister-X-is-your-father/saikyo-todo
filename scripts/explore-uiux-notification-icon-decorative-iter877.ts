/**
 * Phase 6.15 loop iter 877 (mode-D Desktop a11y) —
 * notification-bell の通知 item button 内 type icon span を decorative (aria-hidden) 化、
 * button aria-label に既に含まれる visual.label の重複読み上げを排除。
 *
 * 経緯: iter876 で同 item button 内 body / 未読 dot / time の aria-hidden 化済の続編。
 *   icon wrapper span (line 238-245) は role="img" + aria-label="visual.label" を持つが、
 *   parent button aria-label に同じ visual.label が "${readAt}${visual.label}通知:" として
 *   既に含まれる → SR 二重読み上げ。
 *
 * 修正: icon wrapper span を decorative span に変更 (role="img" / aria-label 削除、
 *   aria-hidden="true" 付与)。data-testid は維持 (E2E 識別子)。
 *
 * 検証: source-side regex assert + iter735/843/849-876 invariant cross-check。
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

  // 1. type icon wrapper span が aria-hidden 化されている
  if (
    /<span[\s\S]+?inline-flex h-5 w-5[\s\S]+?aria-hidden="true"[\s\S]+?data-testid=\{`notification-type-icon-\$\{n\.type\}`\}/.test(
      nb,
    )
  ) {
    findings.push({
      level: 'info',
      message: `notification-bell type icon span aria-hidden 化 OK (decorative)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-bell type icon span decorative 化 未統合`,
    })
  }

  // 2. role="img" / aria-label={visual.label} 削除確認 (button aria-label 単独経路)
  if (!/role="img"[\s\S]+?aria-label=\{visual\.label\}/.test(nb)) {
    findings.push({
      level: 'info',
      message: `notification-bell type icon role="img" + aria-label={visual.label} 削除 OK (重複排除)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-bell type icon 重複 aria-label 残存`,
    })
  }

  // 3. data-testid 維持 (E2E 識別子)
  if (/data-testid=\{`notification-type-icon-\$\{n\.type\}`\}/.test(nb)) {
    findings.push({
      level: 'info',
      message: `notification-bell type icon data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-bell type icon data-testid 破壊`,
    })
  }

  // 4. button aria-label 維持 (visual.label 含む完全 content)
  if (
    /aria-label=\{`\$\{n\.readAt \? '既読' : '未読'\}\$\{visual\.label\}通知: \$\{formatNotificationBody\(n\)\}`\}/.test(
      nb,
    )
  ) {
    findings.push({
      level: 'info',
      message: `notification-bell item button aria-label 完全 content (visual.label 含む) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-bell item button aria-label 破壊`,
    })
  }

  // iter876 invariant: body <p> aria-hidden + time aria-label
  if (
    /<p className="text-xs leading-snug" aria-hidden="true">/.test(nb) &&
    /<span aria-hidden="true">\{formatRelativeTime\(n\.createdAt\)\}<\/span>/.test(nb)
  ) {
    findings.push({
      level: 'info',
      message: `iter876 invariant: notification body + time aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter876 invariant: 破壊` })
  }

  // iter854 invariant
  if (/<span aria-hidden="true">全て既読<\/span>/.test(nb)) {
    findings.push({
      level: 'info',
      message: `iter854 invariant: notification-bell mark-all-read aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter854 invariant: 破壊` })
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

  console.log(`\n=== Findings (notification-icon-decorative-iter877) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
