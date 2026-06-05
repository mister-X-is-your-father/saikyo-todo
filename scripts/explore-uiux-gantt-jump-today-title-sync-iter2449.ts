/**
 * Phase 6.15 loop iter2449: gantt-jump-today button の title を aria-label と sync (旧
 * title "今日の縦線まで横スクロール" 短文で aria-label の visible prefix + 動的日付 +
 * 副作用と divergent だった)、wf-trigger-preset iter2447 / wf-node-preset iter2445 と同
 * title-aria divergence 修正 pattern。
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

  const gv = readFileSync(resolve(here, '../src/components/workspace/gantt-view.tsx'), 'utf8')
  if (!gv.includes('iter2449')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-view iter2449 marker が無い',
    })
  }
  // 新 sync 後 text expression 計 2 回出現
  const text = (
    gv.match(
      /`今日へジャンプ — Gantt timeline を今日 \(\$\{format\(new Date\(\), 'M月d日 \(eee\)'\)\}\) の縦線まで横スクロール`/g,
    ) || []
  ).length
  if (text < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `gantt-jump-today 出現 ${text} 回、aria-label + title 計 2 回必要`,
    })
  }
  // 旧 divergent title (line 先頭 `title="今日の縦線`、comment 外) が残っていないか確認
  const oldDivergent = gv
    .split('\n')
    .filter((l) => l.trim() === 'title="今日の縦線まで横スクロール"').length
  if (oldDivergent > 0) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 divergent title="今日の縦線まで横スクロール" が残っている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — gantt-jump-today title sync 完了、SR/sighted hover text consistency 復元、visible prefix + 動的日付 を hover でも sighted disclose',
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
