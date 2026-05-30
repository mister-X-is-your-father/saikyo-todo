/**
 * Phase 6.15 loop iter1540: workspace dashboard 「← 一覧」 back link aria-label を visible-
 * prefix em-dash 形式に migration (iter1093-1539 sweep convention 着地)。
 *
 * 旧 aria-label `"Workspace 一覧へ戻る"` は visible "一覧" を中位置 "Workspace **一覧** へ戻る"
 * に持ち voice control prefix-matching「click 一覧」 が strict prefix-match で不可 (substring
 * 一致のみ)。iter1093-1539 sweep convention に揃え visible "一覧" 冒頭固定 + em-dash 区切で
 * descriptive 末尾保持。
 *
 * 修正 (page.tsx):
 *   aria-label="Workspace 一覧へ戻る"
 * → aria-label="一覧 — Workspace 一覧へ戻る"
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workspace-back-link-em-dash-iter1540.ts
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
  const src = readFileSync(resolve(here, '../src/app/(workspace)/[workspaceId]/page.tsx'), 'utf8')

  if (!src.includes('aria-label="一覧 — Workspace 一覧へ戻る"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace dashboard 「← 一覧」 back link aria-label が em-dash 形式でない',
    })
  }
  if (src.includes('aria-label="Workspace 一覧へ戻る"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'workspace dashboard 「← 一覧」 back link 旧 aria-label "Workspace 一覧へ戻る" が残存',
    })
  }
  // visible span 維持
  if (!src.includes('<span aria-hidden="true">← 一覧</span>')) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: 'workspace dashboard 「← 一覧」 visible span が破壊された',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — workspace dashboard 「← 一覧」 back link aria-label が visible-prefix em-dash 形式',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.filter((f) => f.level === 'error').length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
