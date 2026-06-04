/**
 * Phase 6.15 loop iter1971: theme-toggle title を aria-label と em-dash 同期
 * (旧 ' に' 助詞接続 → 新 em-dash 区切 で SR ↔ sighted 同 vocab 統一)。
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

  const tt = readFileSync(resolve(here, '../src/components/shared/theme-toggle.tsx'), 'utf8')
  if (!tt.includes("'ライトテーマ — クリックで切替' : 'ダークテーマ — クリックで切替'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'theme-toggle title が aria-label と divergent',
    })
  }
  // 旧 ' に' 接続 が残っていないことも確認
  if (tt.includes("'ライトテーマに切替' : 'ダークテーマに切替'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'theme-toggle 旧 に 助詞 title が残っている',
    })
  }

  const ct = readFileSync(resolve(here, '../src/components/workspace/comment-thread.tsx'), 'utf8')
  if (!ct.includes('iter1969')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1969 comment input title が消えている',
    })
  }

  const period = readFileSync(
    resolve(here, '../src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (!period.includes('iter1967')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1967 period-goal title が消えている',
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
    console.log('(なし) — theme-toggle title em-dash 同期、iter1969-1777 invariant 不変')
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
