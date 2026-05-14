/**
 * Phase 6.15 loop iter 858 (mode-D Desktop a11y) —
 * sprints-panel Sprint Card action 7 button visible text を aria-hidden span で wrap (一括).
 *
 * 課題: src/components/workspace/sprints-panel.tsx の Sprint Card 内 action button 7 件
 * (期間 / 稼働開始 / 完了 / 計画に戻す / 中止 / 振り返り生成 / Pre-mortem 生成) は
 * 各々 aria-label に完全 content (Sprint name + 状態 + action) を含むのに、
 * 内側 visible text は aria-hidden 無し → SR ユーザは aria-label を聞いた後 visible text も
 * 再度読み上げされて重複。iter844-857 sweep の続編。
 *
 * fix (1 ファイル ~9 行差分、7 callsite):
 *   - 期間 / 稼働開始 / 完了 / 計画に戻す / 中止 / 振り返り生成 / Pre-mortem 生成 を <span aria-hidden="true"> で wrap
 *   - 各 button の icon (CalendarRange / Play / CheckCircle / Pause / X / Sparkles ×2) の既存 aria-hidden 維持
 *   - aria-label 単独経路に統一、button 機能不変、visual layout 不変
 *
 * 検証: source-side regex assert + iter735-857 invariant cross-check。
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

  // 1-5. 単純な静的 label (期間 / 稼働開始 / 完了 / 計画に戻す / 中止) は aria-hidden span で wrap
  const staticLabels = ['期間', '稼働開始', '完了', '計画に戻す', '中止']
  for (const lbl of staticLabels) {
    const re = new RegExp(`<span aria-hidden="true">${lbl}</span>`)
    if (re.test(sp)) {
      findings.push({
        level: 'info',
        message: `sprint-action「${lbl}」 visible span aria-hidden 統合 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `sprint-action「${lbl}」 visible aria-hidden 未統合`,
      })
    }
  }

  // 6. 振り返り生成 (動的 label) span aria-hidden
  if (
    /<span aria-hidden="true">\{retroPending \? '振り返り生成中…' : '振り返り生成'\}<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-action 振り返り生成 (動的 label) span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-action 振り返り生成 aria-hidden 未統合`,
    })
  }

  // 7. Pre-mortem 生成 (3 state 動的 label) span aria-hidden
  if (
    /<span aria-hidden="true">\n\s+\{premortemPending\n\s+\? 'Pre-mortem 生成中…'\n\s+: sprint\.premortemGeneratedAt\n\s+\? 'Pre-mortem 再生成'\n\s+: 'Pre-mortem 生成'\}\n\s+<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-action Pre-mortem 生成 (3 state 動的 label) span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-action Pre-mortem 生成 aria-hidden 未統合`,
    })
  }

  // 8. icon aria-hidden 維持 (regression 防止) — CalendarRange / Play / CheckCircle / Pause / X / Sparkles
  const iconCounts = {
    CalendarRange: (sp.match(/<CalendarRange[^/]+aria-hidden="true"/g) ?? []).length,
    Play: (sp.match(/<Play[^/]+aria-hidden="true"/g) ?? []).length,
    CheckCircle: (sp.match(/<CheckCircle[^/]+aria-hidden="true"/g) ?? []).length,
    Pause: (sp.match(/<Pause[^/]+aria-hidden="true"/g) ?? []).length,
    Sparkles: (sp.match(/<Sparkles[^/]+aria-hidden="true"/g) ?? []).length,
  }
  if (
    iconCounts.CalendarRange >= 1 &&
    iconCounts.Play >= 1 &&
    iconCounts.CheckCircle >= 1 &&
    iconCounts.Pause >= 1 &&
    iconCounts.Sparkles >= 2
  ) {
    findings.push({
      level: 'info',
      message: `sprint-action icon aria-hidden 維持 OK (CalendarRange ${iconCounts.CalendarRange} / Play ${iconCounts.Play} / CheckCircle ${iconCounts.CheckCircle} / Pause ${iconCounts.Pause} / Sparkles ${iconCounts.Sparkles})`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-action icon aria-hidden 破壊` })
  }

  // iter857 invariant: op-board 昨日 done aria-hidden
  const op = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">昨日 done \{board\.doneYesterday\.count\} 件<\/span>/.test(op)) {
    findings.push({
      level: 'info',
      message: `iter857 invariant: op-board 昨日 done aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter857 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (sprint-card-actions-aria-hidden-iter858) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
