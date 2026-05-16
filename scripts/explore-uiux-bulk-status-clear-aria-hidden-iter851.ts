/**
 * Phase 6.15 loop iter 851 (mode-D Desktop a11y) —
 * bulk-action-bar status 変更 button + 解除 button:
 * visible text を aria-hidden span で wrap (一括、続編 of iter850 alt)。
 *
 * 課題: src/components/workspace/bulk-action-bar.tsx には iter850 alt で削除 button の
 *   visible "削除" を aria-hidden span で wrap 済だが、同 component 内には他に
 *   2 種類 の visible-text-only button が残っていた:
 *     1. status 変更 button (workspace_statuses 配列、N 件) — visible `{s.label} に`
 *     2. 解除 (clear selection) button — visible "解除"
 *   どちらも aria-label が完全 content を含むのに、内側 visible text は
 *   aria-hidden 無し → SR ユーザは aria-label を聞いた後、visible text も
 *   別途読み上げされる重複 (= iter800-850 sweep と同 pattern)。
 *
 * fix (1 ファイル ~2 行差分):
 *   - status 変更 button: `{s.label} に` → `<span aria-hidden="true">{s.label} に</span>`
 *   - 解除 button: `解除` → `<span aria-hidden="true">解除</span>`
 *   どちらも aria-label 単独経路に統一、機能不変、視覚 layout 不変、shadcn 編集なし
 *   (bulk-action-bar.tsx は project-specific component)。
 *
 * 検証: source-side regex assert + iter735/849/850 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )

  // 1. status 変更 button: visible `{s.label} に` を aria-hidden span で wrap
  if (/<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-status 変更 button visible "{s.label} に" aria-hidden span 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-status 変更 button visible "{s.label} に" aria-hidden 未統合`,
    })
  }

  // 2. 解除 button: visible "解除" を aria-hidden span で wrap
  if (/<span aria-hidden="true">解除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-clear button visible "解除" aria-hidden span 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-clear button visible "解除" aria-hidden 未統合`,
    })
  }

  // 3. status 変更 button aria-label 維持 (既存 content)
  if (
    /aria-label=\{[\s\S]+?`選択 \$\{count\} 件を「\$\{s\.label\}」に変更`/.test(bab) &&
    /aria-label=\{[\s\S]+?`選択 \$\{count\} 件のステータスを変更中…`/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `bulk-status 変更 button aria-label (active + pending) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-status 変更 button aria-label 破壊`,
    })
  }

  // 4. 解除 button aria-label 維持
  if (/aria-label="選択を解除"/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-clear button aria-label="選択を解除" 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-clear button aria-label 破壊`,
    })
  }

  // 5. data-testid 維持
  if (
    /data-testid=\{`bulk-status-\$\{s\.key\}`\}/.test(bab) &&
    /data-testid="bulk-clear"/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `bulk-status / bulk-clear data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `data-testid 破壊` })
  }

  // iter850 invariant: bulk-delete visible "削除" aria-hidden span 維持
  if (/<span aria-hidden="true">削除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete visible "削除" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: 破壊` })
  }

  // iter849 invariant: calendar-view today reset button aria-hidden
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

  console.log(`\n=== Findings (bulk-status-clear-aria-hidden-iter851) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
