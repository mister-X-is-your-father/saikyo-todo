/**
 * Phase 6.15 loop iter1631: src/app/(workspace)/[workspaceId]/{sprints,pdca,time-entries,
 * templates,integrations}/page.tsx の main aria-label を space-separator から em-dash に
 * 統一 (iter1629 src/app sweep の続編)。
 *
 * iter1629 で landmark paren convention 5 件を em-dash 化したが、無 separator (space のみ)
 * の sub-page main aria-label 5 件が残存していた:
 *
 *   - sprints      "Sprint 計画 → 稼働 → 完了"          → "Sprint — 計画 → ..."
 *   - pdca         "PDCA Plan / Do / Check / Act + Lead time" → "PDCA — Plan / ..."
 *   - time-entries "稼働入力 やったこと + 時間を記録"   → "稼働入力 — ..."
 *   - templates    "Templates ワークパッケージ定義"     → "Templates — ..."
 *   - integrations "API 連携 外部 API (Yamory ...) → Item 取込" → "API 連携 — 外部 API ..."
 *
 * 各 visible H1 (title="Sprint"/"PDCA"/"稼働入力"/"Templates"/"API 連携") を冒頭 prefix
 * として維持し voice control prefix-match を保ったまま em-dash 区切に統一。
 * (archive は "アーカイブ済 Item 一覧" の単一句で separator 不要、対象外)
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-app-subpages-em-dash-iter1631.ts
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

  const cases: { path: string; mustContain: string; mustNotContain: string }[] = [
    {
      path: '../src/app/(workspace)/[workspaceId]/sprints/page.tsx',
      mustContain: 'aria-label="Sprint — 計画 → 稼働 → 完了"',
      mustNotContain: 'aria-label="Sprint 計画 → 稼働 → 完了"',
    },
    {
      path: '../src/app/(workspace)/[workspaceId]/pdca/page.tsx',
      mustContain: 'aria-label="PDCA — Plan / Do / Check / Act + Lead time"',
      mustNotContain: 'aria-label="PDCA Plan / Do / Check / Act + Lead time"',
    },
    {
      path: '../src/app/(workspace)/[workspaceId]/time-entries/page.tsx',
      mustContain: 'aria-label="稼働入力 — やったこと + 時間を記録"',
      mustNotContain: 'aria-label="稼働入力 やったこと + 時間を記録"',
    },
    {
      path: '../src/app/(workspace)/[workspaceId]/templates/page.tsx',
      mustContain: 'aria-label="Templates — ワークパッケージ定義"',
      mustNotContain: 'aria-label="Templates ワークパッケージ定義"',
    },
    {
      path: '../src/app/(workspace)/[workspaceId]/integrations/page.tsx',
      mustContain: 'aria-label="API 連携 — 外部 API (Yamory / カスタム REST) → Item 取込"',
      mustNotContain: 'aria-label="API 連携 外部 API (Yamory / カスタム REST) → Item 取込"',
    },
  ]

  for (const c of cases) {
    const src = readFileSync(resolve(here, c.path), 'utf8')
    if (!src.includes(c.mustContain)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `${c.path}: em-dash convention 未着地`,
      })
    }
    if (src.includes(c.mustNotContain)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `${c.path}: 旧 space-separator convention 残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — 5 sub-page main aria-label が em-dash convention で統一')
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
