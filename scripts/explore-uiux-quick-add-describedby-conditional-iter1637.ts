/**
 * Phase 6.15 loop iter1637: quick-add IMEInput の aria-describedby が常時
 * `"quick-add-preview quick-add-hint"` だったため、`quick-add-preview` が
 * `{preview && preview.title}` 条件下でのみ render される (空 input 時は null) と
 * dangling ARIA reference になっていた問題を fix。preview 有無で conditional 切替。
 *
 * 修正 (quick-add.tsx):
 *   旧: `aria-describedby="quick-add-preview quick-add-hint"` (静的)
 *   新: `aria-describedby={preview && preview.title ? 'quick-add-preview quick-add-hint' : 'quick-add-hint'}`
 *
 * axe-core dangling-aria-describedby は minor だが、SR が「読み上げる予定の
 * description が見つからない」状態で stuttering する報告があり (NVDA / VoiceOver)、
 * 加えて WAI-ARIA spec 1.2 § 9.4 (id-ref values) "MUST refer to an element that
 * exists in the DOM" で技術的に違反。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-quick-add-describedby-conditional-iter1637.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/quick-add.tsx'), 'utf8')

  // 1. 新 conditional pattern が着地
  if (
    !src.includes(
      "preview && preview.title ? 'quick-add-preview quick-add-hint' : 'quick-add-hint'",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'quick-add IMEInput の aria-describedby が conditional 化されていない',
    })
  }

  // 2. 旧 静的 aria-describedby props 行が JSX 内で残存していない
  //    (comment block 内 history literal `aria-describedby="quick-add-preview ..."` は除外、
  //    JSX prop は `\s+aria-describedby="` で開始する独立行で検出)
  const lines = src.split('\n')
  const offendingLine = lines.find((l) => /^\s+aria-describedby="[^"]+"\s*$/.test(l))
  if (offendingLine) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `旧 静的 aria-describedby が JSX prop 行に残存: ${offendingLine.trim().slice(0, 80)}`,
    })
  }

  // 3. quick-add-preview は条件付き render されている (line 199 の id 付与は維持)
  if (!src.includes('id="quick-add-preview"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'quick-add-preview ID 要素が削除されている (preview render 自体は維持要)',
    })
  }
  // 4. quick-add-hint は常時 render されているはず (条件 outside)
  if (!src.includes('id="quick-add-hint"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'quick-add-hint ID 要素が削除されている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — quick-add IMEInput の aria-describedby が preview 有無で conditional に切替',
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
