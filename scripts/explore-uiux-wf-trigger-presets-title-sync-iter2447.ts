/**
 * Phase 6.15 loop iter2447: wf-trigger-preset 4 button (manual / cron / item-event /
 * webhook) の title を aria-label と sync (旧 title は短い description のみで visible
 * prefix + 切替 action context 欠落、wf-node-preset iter2445 と同 title-aria divergence
 * 修正 pattern)。
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
  if (!wp.includes('iter2447')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workflows-panel iter2447 marker が無い',
    })
  }
  // 4 trigger preset 各 aria-label + title 計 2 回出現
  const checks: Array<[string, string]> = [
    ['"manual — trigger を manual \\(手動実行のみ\\) に切替"', 'manual'],
    ['"cron — trigger を cron \\(毎日 09:00 等\\) に切替"', 'cron'],
    [
      '"item-event — trigger を item-event \\(create \\/ update \\/ status_change \\/ complete\\) に切替"',
      'item-event',
    ],
    [
      '"webhook — trigger を webhook \\(POST \\/api\\/workflows\\/webhook\\/<secret>\\) に切替"',
      'webhook',
    ],
  ]
  for (const [pattern, name] of checks) {
    const re = new RegExp(pattern, 'g')
    const count = (wp.match(re) || []).length
    if (count < 2) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `wf-trigger-preset-${name} 出現 ${count} 回、aria-label + title 計 2 回必要`,
      })
    }
  }

  // 旧 divergent title (短い description) が残っていないか確認
  const oldTitles = [
    'title="手動 trigger 専用',
    'title="cron trigger (例:',
    'title="item-event (create',
    'title="webhook trigger (POST',
  ]
  for (const old of oldTitles) {
    if (wp.includes(old)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 divergent ${old}... が残っている`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — wf-trigger-preset 4 button title sync 完了、wf-node-preset iter2445 と pair で workflow editor 内 2 preset family (node-presets + trigger-presets) 全 title-aria sync 完成',
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
