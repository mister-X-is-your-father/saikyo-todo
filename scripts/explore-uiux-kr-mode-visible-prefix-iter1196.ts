/**
 * Phase 6.15 loop iter1196: goals-panel KR progress mode select aria-label visible-prefix
 * regression guard。
 *
 * iter1196 で発見した visible-prefix 漏れ (src-kind iter1192 / dep-kind iter1195 と同 sweep):
 * goals-panel.tsx KR progress mode select の旧 aria-label
 * `KR 進捗算出モード (現在: 子 Item 完了率...)` は visible (option text
 * "items (子 Item 完了率)" / "manual (目標値 / 単位)") を中位置に持ち voice control
 * prefix-matching「click items / manual」 match 不可 (substring 一致のみ)。
 *
 * 修正 (goals-panel.tsx): IIFE で visible を先に算出し
 * `${visible} — KR 進捗算出モード (現在: ${visible})` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-kr-mode-visible-prefix-iter1196.ts
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
  const filePath = resolve(here, '../src/components/workspace/goals-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('`${visible} — KR 進捗算出モード (現在: ${visible})`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'KR mode aria-label が visible-prefix 形式 "${visible} — KR 進捗算出モード..." でない',
    })
  }
  if (src.includes('`KR 進捗算出モード (現在: ${')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "KR 進捗算出モード (現在: ...)" が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — KR mode aria-label は visible 冒頭固定済')
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
