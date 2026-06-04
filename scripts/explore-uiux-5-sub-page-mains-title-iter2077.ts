/**
 * Phase 6.15 loop iter2077: workflows/time-entries/templates/integrations/archive sub-page
 * main landmark に title 付与 (9 main landmark family の完成)。
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

  const wfPage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/workflows/page.tsx'),
    'utf8',
  )
  if (!wfPage.includes('title="Workflows — 自動化ワークフロー (n8n 風)"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflows main title が無い',
    })
  }

  const tePage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/time-entries/page.tsx'),
    'utf8',
  )
  if (!tePage.includes('title="稼働入力 — やったこと + 時間を記録"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'time-entries main title が無い',
    })
  }

  const tmpPage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/templates/page.tsx'),
    'utf8',
  )
  if (!tmpPage.includes('title="Templates — ワークパッケージ定義"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'templates main title が無い',
    })
  }

  const integPage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/integrations/page.tsx'),
    'utf8',
  )
  if (!integPage.includes('title="API 連携 — 外部 API (Yamory / カスタム REST) → Item 取込"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations main title が無い',
    })
  }

  const arcPage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/archive/page.tsx'),
    'utf8',
  )
  if (!arcPage.includes('title="アーカイブ済 Item 一覧"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'archive main title が無い',
    })
  }

  const sprintsPage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/sprints/page.tsx'),
    'utf8',
  )
  if (!sprintsPage.includes('title="Sprint — 計画 → 稼働 → 完了"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2075 sprints main title が消えている',
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

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — 5 sub-page main title 付与、iter2075-1777 invariant 不変')
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
