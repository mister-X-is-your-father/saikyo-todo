/**
 * Phase 6.15 loop iter2377: dep-add-btn に title 付与し aria-label
 * state-dependent 3-path (未選択 / pending / selectable) と sync。
 * submit button iter1791 / sprint-period-save iter2351 と同 state-dependent
 * button title pattern を dep-add-btn にも展開、依存 setup form の add button
 * UX 補完 (未選択時の操作 hint hover disclose)。
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
    resolve(here, '../src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (!dp.includes('iter2377')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-dependencies-panel iter2377 marker が無い',
    })
  }
  // 3-path strings 計 2 出現
  const noPick = (dp.match(/'追加 — 依存を追加するには対象 Item を選択してください'/g) || []).length
  if (noPick < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `dep-add-btn no-pick 出現 ${noPick} 回、aria-label + title 計 2 回必要`,
    })
  }
  const pending = (dp.match(/'追加中… — 依存を追加中…'/g) || []).length
  if (pending < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `dep-add-btn pending 出現 ${pending} 回、aria-label + title 計 2 回必要`,
    })
  }
  const ready = (dp.match(/'追加 — 選択した Item を依存先として追加'/g) || []).length
  if (ready < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `dep-add-btn ready 出現 ${ready} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — dep-add-btn title 3-path sync 完了、依存 setup form 操作 hint hover disclose 補完',
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
