/**
 * Phase 6.15 loop iter2365: goals-panel achieved 状態 goal の reactivate + archive 2 button
 * (pair) に title 付与し aria-label state-dependent 2-path と sync (sprint-defaults
 * cancel/save iter2363 / sprint-period cancel/save iter2351 と同 pair button title pattern、
 * goal status transition button family の achieved 状態 sub-family 完成)。
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
  if (!gp.includes('iter2365')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goals-panel iter2365 marker が無い',
    })
  }
  // reactivate 2-path 各 text。"active に戻す" は archived 状態 button (line 711) でも
  // 同 text を使うので 計 3 回 (achieved aria-label + achieved title + archived aria-label)
  // = 達成 statenの aria + title = 2 + archived の aria のみ = 3 で >= 2 を満たす
  const pendingReact = (
    gp.match(/`active に戻す — Goal「\$\{goal\.title\}」のステータスを更新中…`/g) || []
  ).length
  if (pendingReact < 3) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `goal-reactivate pending 出現 ${pendingReact} 回、achieved aria + title + archived aria = 3 必要`,
    })
  }
  const idleReact = (gp.match(/`active に戻す — Goal「\$\{goal\.title\}」を active に戻す`/g) || [])
    .length
  if (idleReact < 3) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `goal-reactivate idle 出現 ${idleReact} 回、achieved aria + title + archived aria = 3 必要`,
    })
  }
  // archive 2-path 各 text (aria + title 2 回)
  const pendingArch = (
    gp.match(/`アーカイブ — Goal「\$\{goal\.title\}」のステータスを更新中…`/g) || []
  ).length
  if (pendingArch < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `goal-archive pending 出現 ${pendingArch} 回、aria-label + title 計 2 回必要`,
    })
  }
  const idleArch = (gp.match(/`アーカイブ — Goal「\$\{goal\.title\}」をアーカイブ`/g) || []).length
  if (idleArch < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `goal-archive idle 出現 ${idleArch} 回、aria-label + title 計 2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — goals-panel achieved status reactivate + archive 2 button pair title sync 完了、goal status transition button family の achieved 状態 sub-family 完成、続く archived 状態 reactivate は次 iter 候補',
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
