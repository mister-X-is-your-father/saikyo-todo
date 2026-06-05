/**
 * Phase 6.15 loop iter2445: wf-node-preset Button の title を aria-label と sync (旧
 * title={preset.title} 短い description のみで aria-label と divergent だった)、
 * pdca-daily-bar iter2443 / goal-decompose iter2435 と同 title-aria divergence 修正 pattern、
 * N preset 一括効果。
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

  const wp = readFileSync(resolve(here, '../src/components/workflow/workflows-panel.tsx'), 'utf8')
  if (!wp.includes('iter2445')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflows-panel iter2445 marker が無い',
    })
  }
  // 新 sync 後 text 計 2 回出現
  const text = (
    wp.match(/`\+ \$\{preset\.type\} — graph に \$\{preset\.title\} の skeleton node を追加`/g) ||
    []
  ).length
  if (text < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `wf-node-preset 出現 ${text} 回、aria-label + title 計 2 回必要`,
    })
  }
  // 旧 divergent `title={preset.title}` (comment 外) が残っていないか確認
  const oldDivergent = wp.split('\n').filter((l) => l.trim() === 'title={preset.title}').length
  if (oldDivergent > 0) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 divergent title={preset.title} が残っている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — wf-node-preset Button title sync 完了、SR/sighted hover text consistency 復元、N preset 一括効果',
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
