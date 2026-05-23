/**
 * Phase 6.15 loop iter1173: sprints-panel sprint-create not-trim path aria-label visible-prefix
 * regression guard。
 *
 * iter1173 で発見した iter1111 sweep の意図的除外 path 再考: iter1111 では「disabled で
 * voice click 不発、visible-prefix sweep 対象外」と判断していたが、disabled button も SR は
 * label を読み上げ、iOS Voice Control は disabled でも match attempt するため visible-prefix
 * で統一すべき (iter1169-1172 同 sweep 残漏 pattern)。旧 aria-label 'Sprint を作成するには
 * 名前を入力してください' は visible "作成" を中位置 "Sprint を **作成** するには…" に持ち
 * voice control prefix-matching「click 作成」 match 不可。
 *
 * 修正 (sprints-panel.tsx):
 *   - not-trim: '作成 — Sprint を作成するには名前を入力してください'
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-create-not-trim-visible-prefix-iter1173.ts
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
  const filePath = resolve(here, '../src/components/workspace/sprints-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes("'作成 — Sprint を作成するには名前を入力してください'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-create not-trim path が visible-prefix 形式 "作成 — ..." でない',
    })
  }
  if (src.includes("'Sprint を作成するには名前を入力してください'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "Sprint を作成するには..." が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sprint-create not-trim path も visible "作成" 冒頭固定済')
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
