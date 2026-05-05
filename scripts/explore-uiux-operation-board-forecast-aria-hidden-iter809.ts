/**
 * Phase 6.15 loop iter 809 (mode-D Desktop a11y) —
 * operation-board-widget 今日完了予測 chip 内 visible span 群を aria-hidden 化
 * (parent role="status" + aria-label が完全 content を持つので inner span は重複)。
 *
 * 課題: operation-board-widget.tsx 行 119-140 の forecast chip は parent div に
 *   role="status" + aria-label が完全 content (formatTodayForecastJa) を含むのに、
 *   内側 4 visible span (見積 / 残 / 余裕 等の数値) は aria-hidden 無し。SR ユーザは
 *   aria-label を聞いた後、内側の数値も再度読み上げられて重複。iter800-808 sweep
 *   の続編。
 *
 * fix (1 ファイル ~6 行差分、4 visible span 各々に aria-hidden="true" 追加):
 *   - 「Nh M m」見積 span / 「の見積 / 残」 label span / 残時間 span / 余裕 or 超過 span
 *
 * 検証: source-side regex assert + iter735-808 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const obw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  // 4 visible span 各々に aria-hidden が付いているかチェック
  const ariaHiddenCount = (obw.match(/className="[^"]+" aria-hidden="true"/g) ?? []).length
  // operation-board-widget 全体の aria-hidden 個数を簡易チェック (forecast chip 4 + その他)
  const hasForecastSpans =
    /font-medium tabular-nums" aria-hidden="true"/.test(obw) &&
    /text-\[11px\] opacity-80" aria-hidden="true"/.test(obw) &&
    /ml-auto font-semibold" aria-hidden="true"/.test(obw)
  if (hasForecastSpans) {
    findings.push({
      level: 'info',
      message: `operation-board forecast chip 内 visible span aria-hidden OK (count=${ariaHiddenCount})`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `operation-board forecast aria-hidden 不完全`,
    })
  }

  // iter808 invariant: notification-bell chip aria-hidden
  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{hint\.label\}<\/span>/.test(nb) &&
    /<span aria-hidden="true">\{unreadBreakdown\}<\/span>/.test(nb)
  ) {
    findings.push({
      level: 'info',
      message: `iter808 invariant: notification-bell chip aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter808 invariant: 破壊` })
  }

  // iter807 invariant: run + pull status badge aria-hidden
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`実行ステータス: \$\{label\}`\}\s*\n\s*>\s*\n\s*<span aria-hidden="true">\{label\}<\/span>/.test(
      wp,
    ) &&
    /aria-label=\{`Pull ステータス: \$\{label\}`\}\s*\n\s*>\s*\n\s*<span aria-hidden="true">\{label\}<\/span>/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter807 invariant: run + pull status badge aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter807 invariant: 破壊` })
  }

  // iter800 invariant: tag-picker trigger inner aria-hidden
  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')
  if (
    /<span className="text-muted-foreground" aria-hidden="true">\s*\n?\s*タグなし\s*\n?\s*<\/span>/.test(
      tp,
    ) &&
    /<span className="flex flex-wrap gap-1" aria-hidden="true">/.test(tp)
  ) {
    findings.push({
      level: 'info',
      message: `iter800 invariant: tag-picker trigger inner aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter800 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor
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

  console.log(`\n=== Findings (operation-board-forecast-aria-hidden-iter809) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
