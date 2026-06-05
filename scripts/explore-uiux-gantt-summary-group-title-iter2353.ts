/**
 * Phase 6.15 loop iter2353: gantt-view gantt-summary banner (role="group") に title 付与し
 * aria-label と sync (engineer-trigger group iter2207 / offline 復帰アクション group iter2323 /
 * Sprint swim-lane root iter2337 と同 role="group" title sync pattern、Gantt 上部 summary
 * banner の multi-metric summary を hover でも 1-glance 把握補完)。
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
  if (!gv.includes('iter2353')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-view iter2353 marker が無い',
    })
  }
  // gantt-summary template aria-label + title 計 2 回出現
  const summaryText = (gv.match(/Gantt project summary — 表示範囲 \$\{totalSpanDays\} 日/g) || [])
    .length
  if (summaryText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `gantt-summary template 出現 ${summaryText} 回、aria-label + title 計 2 回必要`,
    })
  }

  // 既存 Gantt 操作 bar iter2323/2325 (show-deps / hide-done) regression 検査
  if (!gv.includes("title={showDeps ? '依存線を表示中")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2323 show-deps title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — gantt-summary group title sync 完了、Gantt 上部 banner multi-metric summary を hover でも 1-glance 把握、role="group" title family 4 element (engineer-trigger / offline-recovery / swim-lane root + Gantt summary) 拡張',
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
