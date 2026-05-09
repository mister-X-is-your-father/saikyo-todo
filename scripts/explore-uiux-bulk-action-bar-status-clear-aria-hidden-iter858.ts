/**
 * Phase 6.15 loop iter 858 (mode-D Desktop a11y) —
 * bulk-action-bar status 変更 button + clear button visible text を
 * aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/bulk-action-bar.tsx の 2 button 群:
 *   - status 変更 button (行 85-101): aria-label "選択 N 件を「label」に変更" が
 *     完全 content を含むのに visible "{s.label} に" は aria-hidden 無し
 *   - clear button (行 119-128): aria-label "選択を解除" / visible "解除" 不一致
 *     (Label-in-Name は短縮形、SR には親 visible が読まれる衝突も)
 *
 *   いずれも SR 2 経路読み上げ重複。iter850 alt (削除 button) と同 file 内
 *   sibling 規約一致 fix。iter844-857 と同 vocabulary。
 *
 * fix (1 ファイル +2/-2 行):
 *   - status: <span aria-hidden="true">{s.label} に</span>
 *   - clear: <span aria-hidden="true">解除</span>
 *
 * 検証: source-side regex assert + iter850 alt (削除 button) / iter857 / iter856
 *   invariant cross-check。
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

  if (/<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter858-a: bulk-action-bar status 変更 button visible aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter858-a: bulk-action-bar status 変更 button visible aria-hidden 不完全`,
    })
  }

  if (/<span aria-hidden="true">解除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter858-b: bulk-action-bar clear button visible aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter858-b: bulk-action-bar clear button visible aria-hidden 不完全`,
    })
  }

  // iter850 alt invariant: 削除 button aria-hidden + aria-label
  if (
    /<span aria-hidden="true">削除<\/span>/.test(bab) &&
    /aria-label=\{[\s\S]*?`選択 \$\{count\} 件を削除 \(soft delete: ゴミ箱で 30 日保持\)`/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `iter850 alt invariant: bulk-action-bar 削除 button 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 alt invariant: 破壊` })
  }

  // status 変更 / clear button aria-label 維持
  if (
    /aria-label=\{[\s\S]*?`選択 \$\{count\} 件を「\$\{s\.label\}」に変更`/.test(bab) &&
    /aria-label="選択を解除"/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: status 変更 / clear button aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: aria-label 破壊` })
  }

  // iter857 invariant: archive title-link aria-hidden
  const aip = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(aip)) {
    findings.push({
      level: 'info',
      message: `iter857 invariant: archive title-link 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter857 invariant: 破壊` })
  }

  console.log(`\n=== Findings (bulk-action-bar-status-clear-aria-hidden-iter858) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
