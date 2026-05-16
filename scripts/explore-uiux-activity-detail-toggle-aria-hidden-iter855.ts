/**
 * Phase 6.15 loop iter 855 (mode-D Desktop a11y) —
 * activity-log の「詳細を見る/閉じる」 toggle button visible text を
 * <span aria-hidden="true"> で wrap し、aria-label 単独経路に統一。
 *
 * 経緯: iter844-854 sweep の続編。aria-label が完全 content
 *   (「「{label}」の差分 (before / after) を見る/閉じる」) を含むのに
 *   visible text "詳細を見る" / "詳細を閉じる" は aria-hidden 無し → 二重読み上げ。
 *
 * 修正: visible toggle text 全体を <span aria-hidden="true"> で wrap、
 *   aria-label 単独経路に統一。Activity Log は Item edit dialog の高頻度 tab。
 *
 * 検証: source-side regex assert + iter735/843/849-854 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )

  // 1. visible toggle text を span aria-hidden で wrap
  if (/<span aria-hidden="true">\{open \? '詳細を閉じる' : '詳細を見る'\}<\/span>/.test(al)) {
    findings.push({
      level: 'info',
      message: `activity-log detail-toggle visible text aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `activity-log detail-toggle visible text aria-hidden 未統合`,
    })
  }

  // 2. aria-label 完全 content (open / closed 2 状態) 維持
  if (
    /aria-label=\{[\s\S]+?`「\$\{label\}」の差分 \(before \/ after\) を閉じる`/.test(al) &&
    /aria-label=\{[\s\S]+?`「\$\{label\}」の差分 \(before \/ after\) を見る`/.test(al)
  ) {
    findings.push({
      level: 'info',
      message: `activity-log detail-toggle aria-label 2 状態 完全 content 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `activity-log detail-toggle aria-label 破壊`,
    })
  }

  // 3. iter507 tap target pseudo + aria-expanded + data-testid 維持
  if (
    /aria-expanded=\{open\}/.test(al) &&
    /aria-controls=\{detailId\}/.test(al) &&
    /data-testid=\{`activity-detail-toggle-\$\{entry\.id\}`\}/.test(al) &&
    /before:-inset-3/.test(al)
  ) {
    findings.push({
      level: 'info',
      message: `activity-log detail-toggle a11y attrs + tap target 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `activity-log detail-toggle attrs / tap target 破壊`,
    })
  }

  // iter854 invariant: notification-bell 全て既読
  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">全て既読<\/span>/.test(nb)) {
    findings.push({
      level: 'info',
      message: `iter854 invariant: notification-bell 全て既読 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter854 invariant: 破壊` })
  }

  // iter853 invariant
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
      message: `iter853 invariant: schedule-item-picker aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 invariant: 破壊` })
  }

  // iter852 invariant
  const tag = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{t\.name\}<\/span>/.test(tag)) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: tag-picker option aria-hidden 維持 OK`,
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

  console.log(`\n=== Findings (activity-detail-toggle-aria-hidden-iter855) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
