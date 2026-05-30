/**
 * Phase 6.15 loop iter1542: operation-board ItemRow aria-label を em-dash 形式に migration
 * (inbox-view iter1541 と同 sweep の continuation)。
 *
 * 旧 aria-label `${prefix}${title}${time}${date} を編集ダイアログで開く` は visible-prefix
 * ${item.title} を満たすが ' を' 助詞接続で iter1093-1541 sweep の em-dash 区切と divergent。
 *
 * 修正 (operation-board-widget.tsx):
 *   `${statePrefix}${item.title}${timePart}${datePart} を編集ダイアログで開く`
 * → `${statePrefix}${item.title}${timePart}${datePart} — 編集ダイアログで開く`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-operation-board-row-em-dash-iter1542.ts
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

  if (!src.includes('${statePrefix}${item.title}${timePart}${datePart} — 編集ダイアログで開く')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'operation-board ItemRow aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('${statePrefix}${item.title}${timePart}${datePart} を編集ダイアログで開く')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'operation-board ItemRow 旧 " を編集ダイアログで開く" が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — operation-board ItemRow aria-label が em-dash convention 統一済')
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
