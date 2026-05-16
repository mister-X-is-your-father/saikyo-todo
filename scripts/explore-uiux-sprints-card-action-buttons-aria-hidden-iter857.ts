/**
 * Phase 6.15 loop iter 857 (mode-D Desktop a11y) —
 * sprints-panel Sprint Card 内 7 種 action button (期間 / 稼働開始 / 完了 /
 * 計画に戻す / 中止 / 振り返り生成 / Pre-mortem 生成) visible text を
 * <span aria-hidden="true"> で wrap し、aria-label 単独経路に統一。
 *
 * 経緯: iter844-856 sweep の続編。/sprints 画面の Sprint Card 内 status 遷移
 *   + AI Doc 生成 button (合計 7 種) いずれも aria-label に完全 content
 *   (「Sprint「{name}」を稼働開始/完了/計画に戻す/中止」 等 + pending) を含むのに
 *   visible text は aria-hidden 無し → SR 二重読み上げ。
 *
 * 修正: 7 button visible text 一括で <span aria-hidden="true"> で wrap、
 *   aria-label 単独経路に統一。iter841/838/833 batch pattern + iter856 goals
 *   panel 同 batch 続編。
 *
 * 検証: source-side regex assert + iter735/843/849-856 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. 期間 button visible "期間" aria-hidden
  if (/<span aria-hidden="true">期間<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprints-panel period-edit-btn visible "期間" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel period-edit-btn visible aria-hidden 未統合`,
    })
  }

  // 2. 稼働開始 button visible "稼働開始" aria-hidden
  if (/<span aria-hidden="true">稼働開始<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprints-panel sprint-activate visible "稼働開始" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel sprint-activate visible aria-hidden 未統合`,
    })
  }

  // 3. 完了 button visible "完了" aria-hidden
  if (/<span aria-hidden="true">完了<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprints-panel sprint-complete visible "完了" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel sprint-complete visible aria-hidden 未統合`,
    })
  }

  // 4. 計画に戻す button visible "計画に戻す" aria-hidden
  if (/<span aria-hidden="true">計画に戻す<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprints-panel sprint-back-to-planning visible "計画に戻す" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel sprint-back-to-planning visible aria-hidden 未統合`,
    })
  }

  // 5. 中止 button visible "中止" aria-hidden
  if (/<span aria-hidden="true">中止<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprints-panel sprint-cancel visible "中止" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel sprint-cancel visible aria-hidden 未統合`,
    })
  }

  // 6. 振り返り生成 button visible (dynamic 2 状態) aria-hidden
  if (
    /<span aria-hidden="true">\{retroPending \? '振り返り生成中…' : '振り返り生成'\}<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel sprint-retro visible (dynamic 2 状態) aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel sprint-retro visible aria-hidden 未統合`,
    })
  }

  // 7. Pre-mortem 生成 button visible (dynamic 3 状態) aria-hidden
  if (
    /<span aria-hidden="true">[\s\S]+?premortemPending[\s\S]+?'Pre-mortem 生成中…'[\s\S]+?'Pre-mortem 再生成'[\s\S]+?'Pre-mortem 生成'[\s\S]+?<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel sprint-premortem visible (dynamic 3 状態) aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel sprint-premortem visible aria-hidden 未統合`,
    })
  }

  // 8. aria-label 完全 content 維持 (主要 5 種)
  const labelOk =
    /aria-label=\{`Sprint「\$\{sprint\.name\}」の期間を編集`\}/.test(sp) &&
    /aria-label=\{[\s\S]+?`Sprint「\$\{sprint\.name\}」を稼働開始`/.test(sp) &&
    /aria-label=\{[\s\S]+?`Sprint「\$\{sprint\.name\}」を完了`/.test(sp) &&
    /aria-label=\{[\s\S]+?`Sprint「\$\{sprint\.name\}」を計画に戻す`/.test(sp) &&
    /aria-label=\{[\s\S]+?`Sprint「\$\{sprint\.name\}」を中止`/.test(sp)
  if (labelOk) {
    findings.push({
      level: 'info',
      message: `sprints-panel 5 主要 status 遷移 aria-label 完全 content 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel status 遷移 aria-label 破壊`,
    })
  }

  // 9. data-testid 主要 4 種維持
  const testidOk =
    /data-testid=\{`sprint-period-edit-btn-\$\{sprint\.id\}`\}/.test(sp) &&
    /data-testid=\{`sprint-activate-\$\{sprint\.id\}`\}/.test(sp) &&
    /data-testid=\{`sprint-complete-\$\{sprint\.id\}`\}/.test(sp) &&
    /data-testid=\{`sprint-cancel-\$\{sprint\.id\}`\}/.test(sp) &&
    /data-testid=\{`sprint-retro-\$\{sprint\.id\}`\}/.test(sp) &&
    /data-testid=\{`sprint-premortem-\$\{sprint\.id\}`\}/.test(sp)
  if (testidOk) {
    findings.push({
      level: 'info',
      message: `sprints-panel sprint action 6 種 data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel sprint action data-testid 破壊`,
    })
  }

  // iter856 invariant: goals-panel status 遷移 5 button aria-hidden
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">完了<\/span>/.test(gp) &&
    (gp.match(/<span aria-hidden="true">アーカイブ<\/span>/g) ?? []).length >= 2 &&
    (gp.match(/<span aria-hidden="true">active に戻す<\/span>/g) ?? []).length >= 2
  ) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: goals-panel 5 status button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: 破壊` })
  }

  // iter855 invariant
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

  console.log(`\n=== Findings (sprints-card-action-buttons-aria-hidden-iter857) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
