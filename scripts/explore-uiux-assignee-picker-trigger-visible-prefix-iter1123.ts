/**
 * Phase 6.15 loop iter1123: assignee-picker trigger button aria-label visible-prefix regression guard。
 *
 * iter1123 で発見した bug: 旧 aria-label "アサインを選択 (現在未アサイン)" / "アサインを選択
 * (現在 N 件: name1, name2)" は visible "未アサイン" / member names を末尾持ち、voice control
 * prefix-matching「click 未アサイン / name1」 match 不可。iter1072 tag-picker pioneer +
 * iter1093-1122 sweep convention に合わせ visible 冒頭固定。
 *
 * 修正 (assignee-picker.tsx) — 2 path visible-prefix:
 *   - empty: "未アサイン — アサインを選択 (現在未アサイン)"
 *   - selected: "name1, name2 — アサインを選択 (現在 N 件)"
 *
 * 実 supabase + assignee fixture 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-assignee-picker-trigger-visible-prefix-iter1123.ts
 * 前提: なし
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
  const filePath = resolve(here, '../src/components/workspace/assignee-picker.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes("'未アサイン — アサインを選択 (現在未アサイン)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `assignee-picker empty aria-label が visible-prefix 形式でない`,
    })
  }
  if (
    !src.includes(
      "${selectedLabels.join(', ')} — アサインを選択 (現在 ${selectedLabels.length} 件)",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `assignee-picker selected aria-label が visible-prefix 形式でない`,
    })
  }
  if (src.includes("'アサインを選択 (現在未アサイン)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `旧 bare aria-label 'アサインを選択 (現在未アサイン)' が残存`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — assignee-picker trigger aria-label は visible-prefix 配置済')
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
