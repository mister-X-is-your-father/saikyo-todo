/**
 * Phase 6.15 loop iter 856 (mode-D Desktop a11y) —
 * goals-panel の Goal status 変更 button 5 個 (完了 / アーカイブ x2 / active に戻す x2)
 * visible text を <span aria-hidden="true"> で wrap し、aria-label 単独経路に統一。
 *
 * 経緯: iter844-855 sweep の続編。/goals 画面 Goal Card に表示される status 遷移
 *   button (active → completed / archived / archived → active 等 5 button) の visible text
 *   は aria-label が完全 content (「Goal「{title}」を完了」 等) を含むのに aria-hidden 無し。
 *
 * 修正: 5 button 一括で visible text を <span aria-hidden="true"> で wrap、
 *   aria-label 単独経路に統一。iter841/838/833 batch pattern 踏襲。
 *
 * 検証: source-side regex assert + iter735/843/849-855 invariant cross-check。
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

  // 1. visible "完了" を span aria-hidden で wrap
  if (/<span aria-hidden="true">完了<\/span>/.test(gp)) {
    findings.push({
      level: 'info',
      message: `goals-panel goal-complete visible "完了" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel goal-complete visible aria-hidden 未統合`,
    })
  }

  // 2. visible "アーカイブ" 2 箇所 (active / completed status)
  const archiveSpans = (gp.match(/<span aria-hidden="true">アーカイブ<\/span>/g) ?? []).length
  if (archiveSpans >= 2) {
    findings.push({
      level: 'info',
      message: `goals-panel goal-archive visible "アーカイブ" 2 箇所 aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel goal-archive aria-hidden 不足 (現在 ${archiveSpans} 箇所)`,
    })
  }

  // 3. visible "active に戻す" 2 箇所 (completed / archived status)
  const reactivateSpans = (gp.match(/<span aria-hidden="true">active に戻す<\/span>/g) ?? []).length
  if (reactivateSpans >= 2) {
    findings.push({
      level: 'info',
      message: `goals-panel goal-reactivate visible "active に戻す" 2 箇所 aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel goal-reactivate aria-hidden 不足 (現在 ${reactivateSpans} 箇所)`,
    })
  }

  // 4. aria-label 完全 content 維持 (3 種 status 遷移 + pending 共通)
  const labelOk =
    /aria-label=\{[\s\S]+?`Goal「\$\{goal\.title\}」を完了`/.test(gp) &&
    /aria-label=\{[\s\S]+?`Goal「\$\{goal\.title\}」をアーカイブ`/.test(gp) &&
    /aria-label=\{[\s\S]+?`Goal「\$\{goal\.title\}」を active に戻す`/.test(gp) &&
    /aria-label=\{[\s\S]+?`Goal「\$\{goal\.title\}」のステータスを更新中…`/.test(gp)
  if (labelOk) {
    findings.push({
      level: 'info',
      message: `goals-panel status 遷移 4 種 aria-label (3 idle + pending) 完全 content 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel status 遷移 aria-label 破壊`,
    })
  }

  // 5. data-testid 維持
  const testidOk =
    /data-testid=\{`goal-complete-\$\{goal\.id\}`\}/.test(gp) &&
    /data-testid=\{`goal-archive-\$\{goal\.id\}`\}/.test(gp) &&
    /data-testid=\{`goal-reactivate-\$\{goal\.id\}`\}/.test(gp)
  if (testidOk) {
    findings.push({
      level: 'info',
      message: `goals-panel goal status button data-testid 3 種 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel goal status button data-testid 破壊`,
    })
  }

  // iter855 invariant: activity-log detail toggle aria-hidden
  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{open \? '詳細を閉じる' : '詳細を見る'\}<\/span>/.test(al)) {
    findings.push({
      level: 'info',
      message: `iter855 invariant: activity-log detail toggle aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855 invariant: 破壊` })
  }

  // iter854 invariant
  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">全て既読<\/span>/.test(nb)) {
    findings.push({
      level: 'info',
      message: `iter854 invariant: notification-bell aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter854 invariant: 破壊` })
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

  console.log(`\n=== Findings (goals-panel-status-buttons-aria-hidden-iter856) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
