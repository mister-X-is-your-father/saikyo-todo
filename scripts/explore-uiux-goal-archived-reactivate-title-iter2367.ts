/**
 * Phase 6.15 loop iter2367: goals-panel archived 状態 goal の reactivate 単独 button に
 * title 付与し aria-label 2-path と sync (achieved 状態 2 button iter2365 と同 title pattern、
 * goal status transition button family 完成 = 計 3 button 全 hover disclose)。
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

  const gp = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')
  if (!gp.includes('iter2367')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goals-panel iter2367 marker が無い',
    })
  }
  // "active に戻す" 2-path 各 text。achieved aria + title (iter2365 で 2 回) +
  // archived aria + title (iter2367 で 2 回) = 計 4 回
  const pendingReact = (
    gp.match(/`active に戻す — Goal「\$\{goal\.title\}」のステータスを更新中…`/g) || []
  ).length
  if (pendingReact < 4) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `goal-reactivate pending 出現 ${pendingReact} 回、achieved aria + title + archived aria + title = 4 必要`,
    })
  }
  const idleReact = (gp.match(/`active に戻す — Goal「\$\{goal\.title\}」を active に戻す`/g) || [])
    .length
  if (idleReact < 4) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `goal-reactivate idle 出現 ${idleReact} 回、achieved aria + title + archived aria + title = 4 必要`,
    })
  }

  // iter2365 achieved 状態 marker regression 検査
  if (!gp.includes('iter2365')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2365 achieved status button title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — goals-panel archived 状態 reactivate 単独 button title 2-path sync 完了、goal status transition button family 完成 (achieved reactivate + archive + archived reactivate = 計 3 button 全 hover disclose)',
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
