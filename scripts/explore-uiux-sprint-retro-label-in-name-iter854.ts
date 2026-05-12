/**
 * Phase 6.15 loop iter 854 (mode-D Desktop a11y) —
 * sprints-panel 振り返り生成 button: WCAG 2.5.3 (Label in Name) 適合 + visible aria-hidden 統一。
 *
 * 課題: src/components/workspace/sprints-panel.tsx の sprint-retro-* button は
 *   visible "振り返り生成" / "振り返り生成中…" が旧 aria-label "Sprint「N」の振り返り Doc
 *   を生成…" 内に substring としても含まれず (visible は「振り返り生成」、accessible name
 *   は「Sprint…」 で起点) → WCAG 2.5.3 (Label in Name) 直接違反。voice user 発話
 *   「振り返り生成」 でこの button に到達不可。iter844-853 で同 pattern を順次適合化済。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を「振り返り生成 (Sprint「N」、PM Agent …)」 prefix 形に変更し、
 *     visible "振り返り生成" を name 先頭に含める (label-in-name 適合)。
 *   - 同時に visible "振り返り生成" / "振り返り生成中…" を <span aria-hidden="true">
 *     で wrap、aria-label 単独経路に統一 (iter844-853 と一貫)。
 *
 * 検証: source-side regex assert + iter850/851/852/853 invariant cross-check。
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

  // 1. retro aria-label が visible "振り返り生成" prefix
  if (
    /aria-label=\{[\s\S]+?`振り返り生成 \(Sprint「\$\{sprint\.name\}」、PM Agent が完了\/未完 items を要約\)`/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-retro aria-label に visible "振り返り生成" prefix (WCAG 2.5.3 適合) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-retro aria-label が visible "振り返り生成" prefix を含まない`,
    })
  }

  // 2. pending aria-label が visible "振り返り生成中…" prefix
  if (/aria-label=\{[\s\S]+?`振り返り生成中… \(Sprint「\$\{sprint\.name\}」\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-retro pending aria-label に visible "振り返り生成中…" prefix OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-retro pending aria-label が visible "振り返り生成中…" prefix を含まない`,
    })
  }

  // 3. visible "振り返り生成" / "振り返り生成中…" は span aria-hidden で wrap
  if (
    /data-testid=\{`sprint-retro-\$\{sprint\.id\}`\}[\s\S]+?<span aria-hidden="true">[\s\S]+?retroPending \? '振り返り生成中…' : '振り返り生成'[\s\S]+?<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-retro visible "振り返り生成(中…)" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-retro visible "振り返り生成(中…)" aria-hidden 未統合`,
    })
  }

  // 4. data-testid + title 維持
  if (
    /data-testid=\{`sprint-retro-\$\{sprint\.id\}`\}/.test(sp) &&
    /title="PM Agent が完了\/未完 items を要約して Retro Doc を生成"/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `sprint-retro data-testid + title 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-retro attrs 破壊` })
  }

  // iter853 invariant: gantt jump-today visible aria-hidden
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">今日へジャンプ<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `iter853 invariant: gantt jump-today visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 invariant: 破壊` })
  }

  // iter852 invariant: bulk-clear visible "解除" span aria-hidden 維持
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (/data-testid="bulk-clear"[\s\S]+?<span aria-hidden="true">解除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: bulk-clear visible "解除" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter852 invariant: 破壊` })
  }

  // iter850 invariant: bulk-delete visible "削除" span aria-hidden 維持
  if (/<span aria-hidden="true">削除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete visible "削除" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: 破壊` })
  }

  // iter849 invariant: calendar-view 今日 button aria-hidden
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">今日<\/span>/.test(cv)) {
    findings.push({
      level: 'info',
      message: `iter849 invariant: calendar-view 今日 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter849 invariant: 破壊` })
  }

  console.log(`\n=== Findings (sprint-retro-label-in-name-iter854) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
