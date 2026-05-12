/**
 * Phase 6.15 loop iter 883 (mode-D Desktop a11y) —
 * activity-log.tsx 詳細 disclosure button 内 visible "詳細を閉じる / 詳細を見る"
 * を aria-hidden span で wrap (iter800-882 sweep の続編)。
 *
 * 課題: activity-log.tsx 行 200 の activity-detail-toggle button は aria-label
 *   が完全 content ({label} の差分 (before / after) を閉じる/見る) を含むのに、
 *   内側 visible "詳細を閉じる / 詳細を見る" は aria-hidden 無し → SR で
 *   二重読み可能性。Activity 履歴の各 entry ごとに表示される disclosure。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "{open ? '詳細を閉じる' : '詳細を見る'}" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/880/881/882 invariant cross-check。
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
      message: `iter883: activity-log 詳細 disclosure aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter883: 詳細 disclosure aria-hidden 不在`,
    })
  }

  // iter882 invariant: comment-thread 4 button aria-hidden 維持
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">編集<\/span>/.test(ct) &&
    /<span aria-hidden="true">削除<\/span>/.test(ct)
  ) {
    findings.push({
      level: 'info',
      message: `iter882 invariant: comment-thread 4 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter882 invariant: 破壊` })
  }

  // iter881 invariant: workflow run-rerun aria-hidden 維持
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">再<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter881 invariant: workflow run-rerun aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter881 invariant: 破壊` })
  }

  // iter735 invariant: shadcn UI 未編集
  const tabs = readFileSync(resolve(process.cwd(), 'src/components/ui/tabs.tsx'), 'utf8')
  if (!/aria-hidden/.test(tabs)) {
    findings.push({ level: 'info', message: `iter735 invariant: shadcn/tabs.tsx 未編集 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `iter735 invariant: shadcn tabs.tsx に aria-hidden 編集が混入`,
    })
  }

  console.log(`\n=== Findings (iter883) ===`)
  if (findings.length === 0) console.log('(なし)')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
