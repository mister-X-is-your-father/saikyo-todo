/**
 * Phase 6.15 loop iter2303: time-entry create form の 作業内容 + 分 2 input に title 付与し
 * aria-label state-dependent と sync (ItemEditDialog editTitle iter2295 と同 input title
 * pattern を time-entry input にも展開、MCP path A 経由発見)。
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

  const te = readFileSync(
    resolve(here, '../src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (!te.includes('iter2303')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'create-time-entry-form iter2303 marker が無い',
    })
  }
  // 作業内容 empty path aria-label + title 計 2 出現
  const descEmpty = (te.match(/作業内容 \(必須、最大 500 文字、何をやったかを 1 行で\)/g) || [])
    .length
  if (descEmpty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `te-description empty 出現 ${descEmpty} 回、aria-label + title 計 2 回必要`,
    })
  }
  // teMinutes range-invalid path 計 2 出現
  const minutesInvalid = (
    te.match(/分 \(1 以上、最大 1440 = 24h、現在値 \$\{durationMinutes\} は不正\)/g) || []
  ).length
  if (minutesInvalid < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `teMinutes invalid 出現 ${minutesInvalid} 回、aria-label + title 計 2 回必要`,
    })
  }

  const ap = readFileSync(resolve(here, '../src/components/workspace/assignee-picker.tsx'), 'utf8')
  if (!ap.includes('iter2301')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2301 pickers trigger empty title が消えている',
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
    console.log('(なし) — te-description + teMinutes 2 input title sync 完了 (MCP path A 経由発見)')
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
