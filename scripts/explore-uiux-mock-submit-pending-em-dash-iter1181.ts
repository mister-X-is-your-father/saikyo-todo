/**
 * Phase 6.15 loop iter1181: mock-submit-form pending path aria-label em-dash convention 統一
 * regression guard。
 *
 * iter1181 で発見した style 混在: mock-submit-form.tsx `tsSubmit` button の default path は
 * em-dash convention '送信 — ...' に統一済だが、pending path だけ paren convention
 * '送信中… (...)' で divergence していた (iter1143 login / iter1144 mock-login の sibling
 * auth form 揃えと同 sweep)。視覚 prefix は同じだが style 統一でレビュー時の認識コスト下がる。
 *
 * 修正 (mock-submit-form.tsx):
 *   - pending: 旧 '送信中… (mock-timesheet 工数送信処理を実行中)'
 *              → '送信中… — mock-timesheet 工数送信処理を実行中'
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mock-submit-pending-em-dash-iter1181.ts
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
  const filePath = resolve(here, '../src/components/mock-timesheet/mock-submit-form.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes("'送信中… — mock-timesheet 工数送信処理を実行中'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-submit-form pending path が em-dash 形式 "送信中… — ..." でない',
    })
  }
  if (src.includes("'送信中… (mock-timesheet 工数送信処理を実行中)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 paren style "送信中… (mock-timesheet ...)" が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — mock-submit-form pending path も em-dash convention で統一済')
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
