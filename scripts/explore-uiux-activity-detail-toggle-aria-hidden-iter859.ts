/**
 * Phase 6.15 loop iter 859 (mode-D Desktop a11y) —
 * activity-log activity-detail-toggle button visible text を aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/activity-log.tsx 行 186-201 の disclosure button は
 *   iter517 で aria-label 「「label」の差分 (before / after) を{閉じる|見る}」が付与
 *   済だが visible "詳細を閉じる" / "詳細を見る" は aria-hidden 無し → SR 2 経路
 *   読み上げ重複。iter844-858 と同 vocabulary。
 *
 * fix (1 ファイル +1/-1 行):
 *   - <span aria-hidden="true">{open ? '詳細を閉じる' : '詳細を見る'}</span>
 *
 * 検証: source-side regex assert + iter517 (aria-label 動的) / iter507
 *   (pseudo tap target) invariant + iter858 cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )

  if (/<span aria-hidden="true">\{open \? '詳細を閉じる' : '詳細を見る'\}<\/span>/.test(al)) {
    findings.push({
      level: 'info',
      message: `iter859: activity-detail-toggle button visible aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter859: activity-detail-toggle button visible aria-hidden 不完全`,
    })
  }

  // iter517 invariant: dynamic aria-label + aria-expanded + aria-controls
  if (
    /aria-label=\{[\s\S]*?`「\$\{label\}」の差分 \(before \/ after\) を閉じる`/.test(al) &&
    /aria-label=\{[\s\S]*?`「\$\{label\}」の差分 \(before \/ after\) を見る`/.test(al) &&
    /aria-expanded=\{open\}/.test(al) &&
    /aria-controls=\{detailId\}/.test(al)
  ) {
    findings.push({
      level: 'info',
      message: `iter517 invariant: activity-detail-toggle aria-label / expanded / controls 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter517 invariant: 破壊` })
  }

  // iter507 invariant: pseudo tap target ::before
  if (/before:absolute before:-inset-3/.test(al)) {
    findings.push({
      level: 'info',
      message: `iter507 invariant: activity-detail-toggle pseudo tap target 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter507 invariant: 破壊` })
  }

  // iter858 invariant: bulk-action-bar status / clear aria-hidden
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab) &&
    /<span aria-hidden="true">解除<\/span>/.test(bab)
  ) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: bulk-action-bar status / clear 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: 破壊` })
  }

  console.log(`\n=== Findings (activity-detail-toggle-aria-hidden-iter859) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
