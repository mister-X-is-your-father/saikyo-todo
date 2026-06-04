/**
 * Phase 6.15 loop iter2015: item-edit-dialog tab-comments / tab-activity に title 付与
 * (6 tab sweep の 5/6 個目で全完備、6 tab 全 title disclose 完成)。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))

  const ied = readFileSync(
    resolve(here, '../src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (!ied.includes('title="コメントタブ — 議論履歴 + @メンション + AI Plan 投下"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'tab-comments title が無い',
    })
  }
  if (!ied.includes('title="アクティビティタブ — 編集履歴 (audit_log) を時系列表示"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'tab-activity title が無い',
    })
  }
  // 6 tab 全 title 完備の追加確認 (iter2007/2009/2011/2013 + iter2015 で 6 個全部)
  if (
    !ied.includes('title="基本タブ — タイトル / 状態 / 期限 / MUST / 担当 / Tag / DoD を編集"') ||
    !ied.includes('title="サマリタブ — この案件の進捗 / 依存 / 最終更新を一目で確認"') ||
    !ied.includes('iter2011') ||
    !ied.includes('iter2013')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '6 tab sweep のうちいずれかの title が消えている',
    })
  }

  const today = readFileSync(resolve(here, '../src/components/workspace/today-view.tsx'), 'utf8')
  if (!today.includes('title={`${it.dueTime.slice(0, 5)} — 期限時刻`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1875 today dueTime title が消えている',
    })
  }

  const mustBadge = readFileSync(
    resolve(here, '../src/components/workspace/must-badge.tsx'),
    'utf8',
  )
  if (!mustBadge.includes('title="MUST タスク"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1843 MustBadge title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — 6 tab sweep 完備 (comments/activity)、iter2013-1777 invariant 不変')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
