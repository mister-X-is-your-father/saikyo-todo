/**
 * Phase 6.15 loop iter2443: pdca daily-bar の title を aria-label と sync (旧 title は
 * colon 区切 + "完了" 抜けで em-dash convention と divergent)、goal-decompose iter2435 /
 * src-import error iter2437 と同 title-aria divergence 修正 pattern。
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

  const pp = readFileSync(resolve(here, '../src/components/workspace/pdca-panel.tsx'), 'utf8')
  if (!pp.includes('iter2443')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'pdca-panel iter2443 marker が無い',
    })
  }
  // 新 sync 後 text 計 2 回出現
  const text = (pp.match(/`\$\{d\.date\} — 完了 \$\{d\.done\} 件`/g) || []).length
  if (text < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `pdca daily-bar 出現 ${text} 回、aria-label + title 計 2 回必要`,
    })
  }
  // 旧 divergent title (line 先頭が `title=`、comment 外) が残っていないか確認 —
  // 行頭スペース除去後が `title={` で始まり、その内容が colon 区切版なら残存。
  const oldDivergent = pp.split('\n').filter((l) => {
    const t = l.trim()
    return t.startsWith('title=') && t.includes('${d.date}: ${d.done} 件')
  }).length
  if (oldDivergent > 0) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 divergent title (colon 区切) が残っている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — pdca daily-bar title sync 完了、SR/sighted hover text consistency 復元 (em-dash 統一 + "完了" semantic 追加)',
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
