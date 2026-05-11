/**
 * Phase 6.15 loop iter 852 (mode-D Desktop a11y) —
 * bulk-action-bar 解除 button: WCAG 2.5.3 (Label in Name) 適合 + 件数文脈付加。
 *
 * 課題: src/components/workspace/bulk-action-bar.tsx の ghost "解除" button は
 *   visible "解除" が aria-label "選択を解除" の suffix に含まれるが
 *   (1) name 先頭は "選択を" で voice control 「解除」 と発話したとき先頭一致
 *       しない、(2) 何件解除されるか SR で読まれない (BulkActionBar 全体の
 *       region label には件数あるが、button 個別 name には無い)。
 *   delete (iter850) / status (iter851) と vocabulary 不揃い。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を `選択 ${count} 件を解除` に変更し、name に「件数 + 解除」
 *     の文脈を含める (delete / status と vocabulary 揃え)。
 *   - 同時に visible "解除" を <span aria-hidden="true"> で wrap、aria-label
 *     単独経路に統一 (iter844-851 同 pattern)。
 *
 * 検証: source-side regex assert + iter735-851 invariant cross-check。
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

  // 1. 解除 aria-label に件数文脈を含む
  if (/aria-label=\{`選択 \$\{count\} 件を解除`\}/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-clear aria-label に件数文脈 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-clear aria-label が件数文脈を含まない`,
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

  // 3. data-testid="bulk-clear" 維持
  if (/data-testid="bulk-clear"/.test(bab)) {
    findings.push({
      level: 'info',
      message: `bulk-clear data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `bulk-clear data-testid 破壊` })
  }

  // iter851 invariant: bulk-status visible aria-hidden + pending label
  if (/<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: bulk-status visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant (status visible) 破壊` })
  }
  if (/`選択 \$\{count\} 件を「\$\{s\.label\}」に変更中…`/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: bulk-status pending aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant (status pending) 破壊` })
  }

  // iter850 alt invariant: bulk-delete aria-label + visible aria-hidden
  if (
    /aria-label=\{[\s\S]+?`選択 \$\{count\} 件を削除 \(soft delete: ゴミ箱で 30 日保持\)`/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `iter850 alt invariant: bulk-delete aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 alt invariant (aria-label) 破壊` })
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

  console.log(`\n=== Findings (bulk-clear-aria-hidden-iter852) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
