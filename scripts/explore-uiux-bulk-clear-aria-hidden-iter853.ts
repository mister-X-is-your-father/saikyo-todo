/**
 * Phase 6.15 loop iter 853 (mode-D Desktop a11y) —
 * bulk-action-bar 解除 button visible "解除" を aria-hidden span で wrap + aria-label に count 含める。
 *
 * 課題: src/components/workspace/bulk-action-bar.tsx の 解除 button は
 *   - visible: "解除"
 *   - aria-label: "選択を解除" (固定文字列、count 情報無し)
 *   visible "解除" は aria-label 「選択を解除」 に substring 含まれる (label-in-name OK) が、
 *   aria-hidden 無しで SR には重複読み上げ + count 情報が aria-label に欠落 → どれだけの選択を
 *   解除するか SR ユーザに伝わらない。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-label を `解除: 選択 ${count} 件を一括操作の対象から外す` に変更し、visible "解除"
 *     を name 先頭 (prefix) に維持 + count を SR にも伝達。
 *   - visible "解除" を <span aria-hidden="true"> で wrap、aria-label 単独経路に統一
 *     (iter844-851 と同 pattern)。
 *
 * 検証: source-side regex assert + iter735-852 invariant cross-check。
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

  // 1. 解除 button aria-label: visible "解除" が prefix に含まれる + count 含む
  if (/aria-label=\{`解除: 選択 \$\{count\} 件を一括操作の対象から外す`\}/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-clear aria-label に visible "解除" prefix + count 含む (WCAG 2.5.3 適合 + SR context) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-clear aria-label が visible "解除" prefix / count を欠く`,
    })
  }

  // 2. visible "解除" は span aria-hidden で wrap
  if (/<span aria-hidden="true">解除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-clear visible "解除" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-clear visible "解除" aria-hidden 未統合`,
    })
  }

  // 3. data-testid="bulk-clear" + variant="ghost" 維持
  if (/data-testid="bulk-clear"/.test(bab) && /variant="ghost"/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-clear data-testid + variant 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `bulk-clear attrs 破壊` })
  }

  // iter851 invariant: bulk-status aria-label prefix + aria-hidden
  if (
    /aria-label=\{[\s\S]+?`\$\{s\.label\} に変更: 選択 \$\{count\} 件のステータスを更新`/.test(
      bab,
    ) &&
    /<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: bulk-status aria-label prefix + aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  // iter850 invariant: bulk-delete aria-label + aria-hidden
  if (
    /aria-label=\{[\s\S]+?`選択 \$\{count\} 件を削除 \(soft delete: ゴミ箱で 30 日保持\)`/.test(
      bab,
    ) &&
    /<span aria-hidden="true">削除<\/span>/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete aria-label prefix + aria-hidden 維持 OK`,
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

  console.log(`\n=== Findings (bulk-clear-aria-hidden-iter853) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
