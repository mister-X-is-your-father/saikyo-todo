/**
 * Phase 6.15 loop iter 851 (mode-D Desktop a11y) —
 * bulk-action-bar status 変更 button (dynamic N 個) + 解除 button visible text
 * を <span aria-hidden="true"> で wrap し、aria-label 単独経路に統一。
 *
 * 経緯: iter850 alt で bulk-action-bar 削除 button visible "削除" を span aria-hidden
 *   で wrap 済。同 component 内に残る 2 種類の button (status 変更 + 解除) も同 pattern
 *   で aria-label 完全 content / visible aria-hidden の規約に揃える。HANDOFF §9 iter850 alt
 *   の「次 iter 候補: bulk-action-bar status 変更 button visible」 を消化。
 *
 * fix (1 ファイル ~2 行差分):
 *   - status 変更 button (line ~100): {s.label} に → <span aria-hidden>{s.label} に</span>
 *     (workspace_statuses 各々で render される dynamic button、aria-label が
 *      「選択 N 件を「{label}」に変更」 完全 content)
 *   - 解除 button (line ~127): 解除 → <span aria-hidden>解除</span>
 *     (aria-label="選択を解除" 完全 content)
 *
 * 検証: source-side regex assert + iter735/843/849/850 invariant cross-check。
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

  // 1. status 変更 button visible が aria-hidden span で wrap
  if (/<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-status visible "{label} に" span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-status visible "{label} に" aria-hidden 未統合`,
    })
  }

  // 2. status 変更 button aria-label 完全 content (動作 + 件数 + label)
  if (
    /aria-label=\{[\s\S]+?`選択 \$\{count\} 件を「\$\{s\.label\}」に変更`/.test(bab) &&
    /aria-label=\{[\s\S]+?`選択 \$\{count\} 件のステータスを変更中…`/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `bulk-status aria-label 完全 content (idle + pending) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-status aria-label content 欠落`,
    })
  }

  // 3. 解除 button visible "解除" が aria-hidden span で wrap
  if (/<span aria-hidden="true">解除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-clear visible "解除" span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-clear visible "解除" aria-hidden 未統合`,
    })
  }

  // 4. 解除 button aria-label 維持
  if (/aria-label="選択を解除"/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-clear aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-clear aria-label 破壊`,
    })
  }

  // 5. data-testid 維持 (bulk-status-* / bulk-clear / bulk-delete)
  if (
    /data-testid=\{`bulk-status-\$\{s\.key\}`\}/.test(bab) &&
    /data-testid="bulk-clear"/.test(bab) &&
    /data-testid="bulk-delete"/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `bulk-action-bar 3 種 data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `bulk-action-bar data-testid 破壊` })
  }

  // iter850 invariant: bulk-delete aria-label に visible "削除" prefix 含む
  if (
    /aria-label=\{[\s\S]+?`選択 \$\{count\} 件を削除 \(soft delete: ゴミ箱で 30 日保持\)`/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete aria-label label-in-name 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: 破壊` })
  }

  if (/<span aria-hidden="true">削除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant (delete span): 破壊` })
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

  // iter843 invariant: item-edit-dialog reload button aria-hidden
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">最新を読み込み<\/span>/.test(ied)) {
    findings.push({
      level: 'info',
      message: `iter843 invariant: item-edit-dialog reload button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter843 invariant: 破壊` })
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

  console.log(`\n=== Findings (bulk-action-status-clear-aria-hidden-iter851) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
