/**
 * Phase 6.15 loop iter1114: quick-add submit button default aria-label visible-prefix
 * regression guard。
 *
 * iter1114 で発見した bug: default 旧 aria-label `「${preview.title}」を作成 (Enter でも可)` は
 * visible "作成" を末尾持ち、voice control prefix-matching「click 作成」 match 不可。
 * pending visible "…" は aria-label `「${preview.title}」を作成中…` の末尾 "…" と substring 一致
 * (prefix 化 skip)。empty/MUST 2 path は visible "作成" が aria-label prefix 化されてないが
 * disabled で voice click 不発 + UX 上 distinct messaging が優先で維持。
 *
 * 修正 (quick-add.tsx): default aria-label を `作成 — 「${preview.title}」を作成 (Enter でも可)` に変更。
 *
 * 実 supabase + workspace + quick-add 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-quick-add-default-visible-prefix-iter1114.ts
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
  const filePath = resolve(here, '../src/components/workspace/quick-add.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('`作成 — 「${preview.title}」を作成 (Enter でも可)`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `quick-add default aria-label が visible-prefix '作成 — 「title」を作成 (Enter でも可)' でない`,
    })
  }
  // 旧 bare default が残存していないか
  if (src.includes('`「${preview.title}」を作成 (Enter でも可)`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `旧 bare default aria-label '「title」を作成 (Enter でも可)' が残存`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — quick-add default aria-label は visible-prefix 配置済')
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
