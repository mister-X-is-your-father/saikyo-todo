/**
 * Phase 6.15 loop iter1553: active-timer-panel PiP button 4 path aria-label を
 * em-dash 形式に統一 (iter1093-1552 sweep convention 着地)。
 *
 * 旧 aria-label 4 path のうち default のみ em-dash convention に合致:
 *   - unsupported: `"Picture-in-Picture は Chrome / Edge で利用可能"` (' は' 接続)
 *   - inPip:       `"Picture-in-Picture を閉じてページに戻す"` (' を' 助詞)
 *   - pending:     `"Picture-in-Picture を開いています…"` (' を' 助詞)
 *   - default:     `"Picture-in-Picture — 常に手前表示で別 window 化"` (em-dash OK)
 *
 * iter1093-1552 sweep の em-dash 区切と divergent。4 path 全てで em-dash 統一。
 *
 * 修正 (active-timer-panel.tsx):
 *   "Picture-in-Picture は Chrome / Edge で利用可能" → "Picture-in-Picture — Chrome / Edge で利用可能"
 *   "Picture-in-Picture を閉じてページに戻す" → "Picture-in-Picture — 閉じてページに戻す"
 *   "Picture-in-Picture を開いています…" → "Picture-in-Picture — 開いています…"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-active-timer-pip-em-dash-iter1553.ts
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
    resolve(here, '../src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )

  if (!src.includes("'Picture-in-Picture — Chrome / Edge で利用可能'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'active-timer PiP unsupported path が em-dash 形式でない',
    })
  }
  if (!src.includes("'Picture-in-Picture — 閉じてページに戻す'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'active-timer PiP inPip path が em-dash 形式でない',
    })
  }
  if (!src.includes("'Picture-in-Picture — 開いています…'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'active-timer PiP pending path が em-dash 形式でない',
    })
  }
  if (src.includes("'Picture-in-Picture は Chrome / Edge で利用可能'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 は接続 (unsupported) が残存',
    })
  }
  if (src.includes("'Picture-in-Picture を閉じてページに戻す'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 を助詞 (inPip) が残存',
    })
  }
  if (src.includes("'Picture-in-Picture を開いています…'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 を助詞 (pending) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — active-timer PiP 4 path が em-dash 形式で統一')
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
