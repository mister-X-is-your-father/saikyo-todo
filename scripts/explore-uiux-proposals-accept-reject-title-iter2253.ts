/**
 * Phase 6.15 loop iter2253: proposals-accept-all / proposals-reject-all button に
 * title 付与し aria-label state-dependent 2-path と sync (redecompose iter2107 と同
 * pattern、bulk proposal action button pair 完成)。
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

  const dp = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!dp.includes('iter2253')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'decompose-proposals-panel iter2253 marker が無い',
    })
  }
  // accept-all: aria-label + title 計 2 出現
  const acceptText = (dp.match(/全て採用 — 保留中の提案 \$\{list\.length\} 件を採用中…/g) || [])
    .length
  if (acceptText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `accept-all pending text 出現 ${acceptText} 回、aria-label + title 計 2 回必要`,
    })
  }
  // reject-all: aria-label + title 計 2 出現
  const rejectText = (dp.match(/全て却下 — 保留中の提案 \$\{list\.length\} 件を却下中…/g) || [])
    .length
  if (rejectText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `reject-all pending text 出現 ${rejectText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const tp = readFileSync(resolve(here, '../src/components/workspace/tag-picker.tsx'), 'utf8')
  if (!tp.includes('iter2251')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2251 tag-picker PopoverContent title が消えている',
    })
  }

  const tv = readFileSync(resolve(here, '../src/components/workspace/today-view.tsx'), 'utf8')
  if (!tv.includes('iter2249')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2249 today-view header chips title が消えている',
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
    console.log(
      '(なし) — proposals-accept-all / proposals-reject-all title 2-path sync 完了、bulk proposal action button pair 完成',
    )
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
