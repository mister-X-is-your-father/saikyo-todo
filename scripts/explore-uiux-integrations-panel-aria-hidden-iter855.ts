/**
 * Phase 6.15 loop iter 855 (mode-D Desktop a11y) —
 * integrations-panel: 5 button visible text を aria-hidden span で wrap (一括)。
 *
 * 課題: src/components/integrations/integrations-panel.tsx は External Source
 *   (Yamory / カスタム REST) 連携 panel。5 種 button いずれも aria-label が
 *   完全 content を含むのに visible text は aria-hidden 無し → SR 重複読み上げ:
 *     1. EmptyState 「作成フォームへ」 button
 *     2. Pull button — visible "Pull 中…" / "Pull"
 *     3. 有効化/無効化 toggle button
 *     4. 履歴 disclosure button (chevron icon は aria-hidden 既存)
 *     5. Source 作成 form の Submit button — visible "作成中…" / "作成"
 *
 * fix (1 ファイル ~5 spot):
 *   - 各 visible text を <span aria-hidden="true"> で wrap
 *   - aria-label 単独経路に統一、機能不変、視覚 layout 不変、shadcn 編集なし
 *   - iter800-854 sweep の続編 (integrations panel family に展開)
 *
 * 検証: source-side regex assert + iter735/853/854 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )

  // 1. EmptyState 作成フォームへ button
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `EmptyState 作成フォームへ button visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `EmptyState 作成フォームへ button visible aria-hidden 未統合`,
    })
  }

  // 2. Pull button
  if (/<span aria-hidden="true">\{trigger\.isPending \? 'Pull 中…' : 'Pull'\}<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `Pull button visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `Pull button visible aria-hidden 未統合`,
    })
  }

  // 3. 有効化/無効化 toggle button
  if (/<span aria-hidden="true">\{src\.enabled \? '無効化' : '有効化'\}<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `有効化/無効化 toggle button visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `有効化/無効化 toggle button visible aria-hidden 未統合`,
    })
  }

  // 4. 履歴 disclosure button
  if (/<span aria-hidden="true">履歴<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `履歴 disclosure button visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `履歴 disclosure button visible aria-hidden 未統合`,
    })
  }

  // 5. 作成 Submit button
  if (/<span aria-hidden="true">\{create\.isPending \? '作成中…' : '作成'\}<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `作成 Submit button visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `作成 Submit button visible aria-hidden 未統合`,
    })
  }

  // 6. 各 button aria-label 維持
  const ariaLabelChecks = [
    /aria-label="Source 作成フォームの『名前』入力欄にフォーカス"/,
    /aria-label=\{[\s\S]+?`Source「\$\{src\.name\}」を手動 Pull \(sync 実行、30s timeout\)`/,
    /aria-label=\{[\s\S]+?`Source「\$\{src\.name\}」を\$\{src\.enabled \? '無効化' : '有効化'\}`/,
    /aria-label=\{[\s\S]+?`Source「\$\{src\.name\}」の Pull 履歴 \(直近 5 件\) を表示`/,
    /aria-label=\{[\s\S]+?'External Source を新規作成'/,
  ]
  const labelOk = ariaLabelChecks.filter((re) => re.test(ip)).length
  if (labelOk === ariaLabelChecks.length) {
    findings.push({
      level: 'info',
      message: `5 button aria-label 維持 OK (${labelOk}/${ariaLabelChecks.length})`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `aria-label 破壊 (${labelOk}/${ariaLabelChecks.length})`,
    })
  }

  // 7. data-testid 維持
  const testidChecks = [
    /data-testid="integrations-empty-create"/,
    /data-testid=\{`src-pull-\$\{src\.id\}`\}/,
    /data-testid=\{`src-toggle-\$\{src\.id\}`\}/,
    /data-testid=\{`src-imports-toggle-\$\{src\.id\}`\}/,
    /data-testid="src-create-btn"/,
  ]
  const testidOk = testidChecks.filter((re) => re.test(ip)).length
  if (testidOk === testidChecks.length) {
    findings.push({
      level: 'info',
      message: `5 button data-testid 維持 OK (${testidOk}/${testidChecks.length})`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `data-testid 破壊 (${testidOk}/${testidChecks.length})`,
    })
  }

  // iter854 invariant: operation-board-widget visible aria-hidden
  const obw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">昨日 done \{board\.doneYesterday\.count\} 件<\/span>/.test(obw)) {
    findings.push({
      level: 'info',
      message: `iter854 invariant: operation-board 昨日 done aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter854 invariant: 破壊` })
  }

  // iter853 invariant: schedule-item-picker visible aria-hidden
  const sip = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">キャンセル<\/span>/.test(sip)) {
    findings.push({
      level: 'info',
      message: `iter853 invariant: schedule-item-picker キャンセル aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 invariant: 破壊` })
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

  console.log(`\n=== Findings (integrations-panel-aria-hidden-iter855) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
