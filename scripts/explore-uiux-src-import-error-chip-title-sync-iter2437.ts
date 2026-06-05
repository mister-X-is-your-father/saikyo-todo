/**
 * Phase 6.15 loop iter2437: src-import error chip の title を aria-label と sync (旧
 * title={r.error} は素 error 文で aria-label "${r.error} — Pull エラー" と divergent
 * だった)、Pull ステータス chip iter1559 / KR delete iter2099 と同 title-aria divergence
 * 修正 pattern。
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

  const ip = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (!ip.includes('iter2437')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations-panel iter2437 marker が無い',
    })
  }
  // 新 title + aria-label 計 2 回出現
  const text = (ip.match(/`\$\{r\.error\} — Pull エラー`/g) || []).length
  if (text < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `src-import error 出現 ${text} 回、aria-label + title 計 2 回必要`,
    })
  }
  // 旧 divergent `title={r.error}` (em-dash 無、line 先頭が `title=`、コメント外) が
  // 残っていないか確認 — ip を行毎に走査し、行頭スペース除去後が `title={r.error}` で
  // 始まる行のみ count (comment 内の言及は無視)。
  const oldDivergent = ip.split('\n').filter((l) => l.trim().startsWith('title={r.error}')).length
  if (oldDivergent > 0) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 divergent title={r.error} が残っている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — src-import error chip title sync 完了、SR/sighted hover text consistency 復元、"Pull エラー" context suffix も hover で sighted disclose',
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
