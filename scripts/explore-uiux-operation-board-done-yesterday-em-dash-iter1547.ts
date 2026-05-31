/**
 * Phase 6.15 loop iter1547: operation-board 「昨日 done」 disclosure aria-label を
 * em-dash 形式に migration (iter1093-1546 sweep convention 着地)。
 *
 * 旧 aria-label `"昨日 done ${count} 件の一覧を{閉じる|表示}"` は ' を' 助詞接続で
 * iter1093-1546 sweep の em-dash 区切と divergent。team-capacity-panel summary (iter1544) と
 * 同 pattern。visible prefix `"昨日 done {count} 件"` は維持 (voice control)。
 *
 * 修正 (operation-board-widget.tsx):
 *   "昨日 done ${count} 件の一覧を閉じる" → "昨日 done ${count} 件 — 一覧を閉じる"
 *   "昨日 done ${count} 件の一覧を表示" → "昨日 done ${count} 件 — 一覧を表示"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-operation-board-done-yesterday-em-dash-iter1547.ts
 * 前提: なし (source 直読 invariant)
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
  const src = readFileSync(
    resolve(here, '../src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )

  if (!src.includes('件 — 一覧を閉じる')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '昨日 done disclosure aria-label (閉じる path) が em-dash 形式でない',
    })
  }
  if (!src.includes('件 — 一覧を表示')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '昨日 done disclosure aria-label (表示 path) が em-dash 形式でない',
    })
  }
  if (src.includes('件の一覧を閉じる')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '昨日 done disclosure 旧 を-助詞接続 aria-label (閉じる) 残存',
    })
  }
  if (src.includes('件の一覧を表示')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '昨日 done disclosure 旧 を-助詞接続 aria-label (表示) 残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — 昨日 done disclosure aria-label が em-dash 形式 (両 path)')
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
