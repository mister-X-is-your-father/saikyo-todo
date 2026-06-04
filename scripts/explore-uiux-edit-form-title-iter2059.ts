/**
 * Phase 6.15 loop iter2059: edit form 群 (Sprint デフォルト / Sprint 期間編集 / Budget 上限編集)
 * に title 付与 (3 entity create form iter2045 と pair、6 form family の完成)。
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

  const sp = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')
  if (!sp.includes('title="Sprint デフォルト設定 編集フォーム"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'Sprint デフォルト設定 編集フォーム title が無い',
    })
  }
  if (!sp.includes('title={`Sprint「${sprint.name}」期間編集フォーム`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'Sprint 期間編集フォーム title が無い',
    })
  }

  const bp = readFileSync(resolve(here, '../src/components/workspace/budget-panel.tsx'), 'utf8')
  if (!bp.includes('title="AI 月次コスト上限編集フォーム"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'AI 月次コスト上限編集フォーム title が無い',
    })
  }

  const gp = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')
  if (!gp.includes('title="Goal 作成フォーム"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2045 Goal 作成フォーム title が消えている',
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
    console.log('(なし) — 3 edit form title 付与、iter2057-1777 invariant 不変')
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
