/**
 * Phase 6.15 loop iter1113: create-time-entry-form default aria-label visible-prefix
 * regression guard。
 *
 * iter1113 で発見した bug: default 旧 aria-label "稼働記録を作成" は visible "記録" を
 * "稼働**記録**" 中位置持ち、voice control prefix-matching「click 記録」 match 不可。
 * pending visible "…" (1 char) は aria-label "稼働記録を作成中…" の末尾 "…" と substring 一致
 * (prefix 化は冗長で skip)。
 *
 * 修正 (create-time-entry-form.tsx): default aria-label を "記録 — 稼働記録を作成" に変更。
 *
 * 実 supabase + time-entry fixture 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-create-time-entry-default-visible-prefix-iter1113.ts
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
  const filePath = resolve(here, '../src/components/time-entry/create-time-entry-form.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes("'記録 — 稼働記録を作成'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `create-time-entry-form default aria-label が '記録 — 稼働記録を作成' でない`,
    })
  }
  // 旧 bare 'default 単独' が残ってないか (note: pending '稼働記録を作成中…' は visible '…'
  // と substring 一致のため残置 OK)
  if (src.includes("? '稼働記録を作成中…' : '稼働記録を作成'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `旧 default bare aria-label '稼働記録を作成' が残存`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — create-time-entry-form default aria-label は visible-prefix 配置済')
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
