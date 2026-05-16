/**
 * Phase 6.15 loop iter 854 (mode-D Desktop a11y) —
 * operation-board-widget: 3 button (Quick wins / 集中ブロック / 昨日 done toggle)
 * visible text を aria-hidden span で wrap (一括)。
 *
 * 課題: src/components/workspace/operation-board-widget.tsx は workspace home
 *   "今日の作戦盤" widget。3 種 button いずれも aria-label が完全 content を
 *   含むのに visible text は aria-hidden 無し → SR 重複読み上げ:
 *     1. Quick wins item button (forecast.quickWins、上位 3 件) — visible spans
 *        `{estimateMin}m` + `{title}` 両方とも、aria-label は
 *        `${title} を開く (見積 ${estimateMin}分)` で 完全 content
 *     2. 集中ブロック item button (forecast.focusBlocks、上位 2 件) — visible
 *        spans 同 pattern、aria-label `${title} を開く (集中 ${estimateMin}分)`
 *     3. 昨日 done 一覧 toggle button — visible "昨日 done {count} 件" plain text、
 *        aria-label `昨日 done ${count} 件の一覧を表示/閉じる` 完全 content
 *
 * fix (1 ファイル ~3 spot):
 *   - 1, 2: 各 visible span に aria-hidden="true" 追加 (4 span 計)
 *   - 3: visible plain text を <span aria-hidden="true"> で wrap
 *   各々 aria-label 単独経路に統一、機能不変、視覚 layout 不変、shadcn 編集なし
 *   (operation-board-widget.tsx は project-specific component)。
 *   iter800-853 sweep の続編 (dashboard widget family に展開)。
 *
 * 検証: source-side regex assert + iter735/851/852/853 invariant cross-check。
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

  // 1. Quick wins / 集中ブロック item button: estimate span に aria-hidden=true
  const estimateAriaHiddenMatches = obw.match(
    /<span[\s\S]*?className="text-muted-foreground text-\[10px\] tabular-nums"[\s\S]*?aria-hidden="true"[\s\S]*?>\s*\{it\.estimateMin\}m\s*<\/span>/g,
  )
  if (estimateAriaHiddenMatches && estimateAriaHiddenMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `Quick wins / 集中 estimate span aria-hidden 統合 OK (${estimateAriaHiddenMatches.length} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `Quick wins / 集中 estimate span aria-hidden 未統合 or 件数不足 (${estimateAriaHiddenMatches?.length ?? 0})`,
    })
  }

  // 2. Quick wins / 集中ブロック item button: title span に aria-hidden=true
  const titleAriaHiddenMatches = obw.match(
    /<span className="truncate" aria-hidden="true">\s*\{it\.title\}\s*<\/span>/g,
  )
  if (titleAriaHiddenMatches && titleAriaHiddenMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `Quick wins / 集中 title span aria-hidden 統合 OK (${titleAriaHiddenMatches.length} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `Quick wins / 集中 title span aria-hidden 未統合 or 件数不足 (${titleAriaHiddenMatches?.length ?? 0})`,
    })
  }

  // 3. 昨日 done toggle button: visible plain text を aria-hidden span で wrap
  if (/<span aria-hidden="true">昨日 done \{board\.doneYesterday\.count\} 件<\/span>/.test(obw)) {
    findings.push({
      level: 'info',
      message: `昨日 done toggle visible text aria-hidden span 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `昨日 done toggle visible text aria-hidden 未統合`,
    })
  }

  // 4. 各 button aria-label 維持
  if (
    /aria-label=\{`\$\{it\.title\} を開く \(見積 \$\{it\.estimateMin\}分\)`\}/.test(obw) &&
    /aria-label=\{`\$\{it\.title\} を開く \(集中 \$\{it\.estimateMin\}分\)`\}/.test(obw) &&
    /aria-label=\{[\s\S]+?`昨日 done \$\{board\.doneYesterday\.count\} 件の一覧を表示`/.test(obw) &&
    /aria-label=\{[\s\S]+?`昨日 done \$\{board\.doneYesterday\.count\} 件の一覧を閉じる`/.test(obw)
  ) {
    findings.push({
      level: 'info',
      message: `3 button aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `aria-label 破壊` })
  }

  // 5. data-testid 維持
  if (/data-testid="operation-board-done-yesterday-toggle"/.test(obw)) {
    findings.push({
      level: 'info',
      message: `operation-board-done-yesterday-toggle data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `data-testid 破壊` })
  }

  // 6. icon (ChevronDown/Right + CheckCircle2) aria-hidden 維持
  const iconMatches = obw.match(
    /<(ChevronDown|ChevronRight|CheckCircle2)[\s\S]+?aria-hidden="true"/g,
  )
  if (iconMatches && iconMatches.length >= 3) {
    findings.push({
      level: 'info',
      message: `chevron / check icons aria-hidden 維持 OK (${iconMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `icon aria-hidden 破壊` })
  }

  // iter853 invariant: schedule-item-picker 3 button visible aria-hidden
  const sip = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (
    /<span className="truncate" aria-hidden="true">\s*\{it\.title\}\s*<\/span>/.test(sip) &&
    /<span aria-hidden="true">割込みとして追加<\/span>/.test(sip) &&
    /<span aria-hidden="true">キャンセル<\/span>/.test(sip)
  ) {
    findings.push({
      level: 'info',
      message: `iter853 invariant: schedule-item-picker 3 button visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 invariant: 破壊` })
  }

  // iter852 invariant: assignee-picker option visible aria-hidden
  const apk = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{label\}<\/span>/.test(apk)) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: assignee-picker option visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter852 invariant: 破壊` })
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

  console.log(`\n=== Findings (operation-board-buttons-aria-hidden-iter854) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
