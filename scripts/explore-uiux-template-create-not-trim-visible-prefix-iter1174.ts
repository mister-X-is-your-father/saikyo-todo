/**
 * Phase 6.15 loop iter1174: templates-panel template create not-trim path aria-label visible-prefix
 * regression guard。
 *
 * iter1174 で発見した iter1110 sweep の判断ミス: iter1110 では「empty-title path は visible '作成'
 * が '作成するには...' prefix で維持」と判断したが、prefix は 'Template' で始まり visible "作成" は
 * 中位置 "Template を **作成** するには…" の substring に過ぎず prefix-match 不可
 * (iter1169-1173 と同 sweep 残漏 pattern)。
 *
 * 修正 (templates-panel.tsx):
 *   - not-trim: '作成 — Template を作成するには名前を入力してください'
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-template-create-not-trim-visible-prefix-iter1174.ts
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
  const filePath = resolve(here, '../src/components/template/templates-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes("'作成 — Template を作成するには名前を入力してください'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'template create not-trim path が visible-prefix 形式 "作成 — ..." でない',
    })
  }
  if (src.includes("'Template を作成するには名前を入力してください'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "Template を作成するには..." が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — template create not-trim path も visible "作成" 冒頭固定済')
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
