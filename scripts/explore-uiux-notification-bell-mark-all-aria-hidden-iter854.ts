/**
 * Phase 6.15 loop iter 854 (mode-D Desktop a11y) —
 * notification-bell の「全て既読」 button visible text を
 * <span aria-hidden="true"> で wrap し、aria-label 単独経路に統一。
 *
 * 経緯: iter844-853 sweep の続編。aria-label が 3 状態 (未読 0 / pending / 通常)
 *   の完全 content を含むのに visible "全て既読" は aria-hidden 無し → 二重読み上げ。
 *
 * 修正: visible "全て既読" を <span aria-hidden="true"> で wrap、aria-label 単独経路に統一。
 *   icon (CheckCheck) は既に aria-hidden、ここを統一して規約一致。
 *
 * 検証: source-side regex assert + iter735/843/849/850/851/852/853 invariant cross-check。
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

  // 1. visible "全て既読" を span aria-hidden で wrap
  if (/<span aria-hidden="true">全て既読<\/span>/.test(nb)) {
    findings.push({
      level: 'info',
      message: `notification-bell mark-all-read visible "全て既読" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-bell mark-all-read visible aria-hidden 未統合`,
    })
  }

  // 2. mark-all-read aria-label 完全 content 維持 (3 状態)
  const ariaLabelOk =
    /aria-label=\{[\s\S]+?'未読通知がないため既読化不要'/.test(nb) &&
    /aria-label=\{[\s\S]+?`未読 \$\{unreadCount\} 件を既読化中…`/.test(nb) &&
    /aria-label=\{[\s\S]+?`未読 \$\{unreadCount\} 件をすべて既読にする`/.test(nb)
  if (ariaLabelOk) {
    findings.push({
      level: 'info',
      message: `notification-bell mark-all-read aria-label 3 状態 完全 content 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-bell mark-all-read aria-label 破壊`,
    })
  }

  // 3. icon CheckCheck aria-hidden 維持
  if (/<CheckCheck className="mr-1 h-3\.5 w-3\.5" aria-hidden="true" \/>/.test(nb)) {
    findings.push({
      level: 'info',
      message: `notification-bell mark-all-read icon aria-hidden 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-bell mark-all-read icon aria-hidden 破壊`,
    })
  }

  // 4. data-testid + bell trigger aria-label 維持
  if (
    /data-testid="notification-mark-all-read"/.test(nb) &&
    /aria-label=\{`通知 \(未読 \$\{unreadCount\} 件\)`\}/.test(nb)
  ) {
    findings.push({
      level: 'info',
      message: `notification-bell data-testid + trigger aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-bell trigger / data-testid 破壊`,
    })
  }

  // iter853 invariant: schedule-item-picker 3 種 visible aria-hidden
  const sip = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">割込みとして追加<\/span>/.test(sip) &&
    /<span aria-hidden="true">キャンセル<\/span>/.test(sip)
  ) {
    findings.push({
      level: 'info',
      message: `iter853 invariant: schedule-item-picker visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 invariant: 破壊` })
  }

  // iter852 invariant
  const assignee = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  if ((assignee.match(/<span aria-hidden="true">\{label\}<\/span>/g) ?? []).length >= 2) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: assignee-picker option aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter852 invariant: 破壊` })
  }

  // iter851 invariant
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab) &&
    /<span aria-hidden="true">解除<\/span>/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: bulk-action-bar aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
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

  console.log(`\n=== Findings (notification-bell-mark-all-aria-hidden-iter854) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
