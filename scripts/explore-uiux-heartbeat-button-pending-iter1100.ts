/**
 * Phase 6.15 loop iter1100: HeartbeatButton pending state aria-label visible substring 一致
 * regression guard。
 *
 * iter1100 で発見した bug: 旧 pending aria-label "Heartbeat スキャンを実行中…" は visible
 * "スキャン中…" を literal substring に含まない (ン と 中 の間に "を実行" が挿入されて連続不一致)
 * = WCAG 2.5.3 違反 + voice control「click スキャン中…」 matching 不可。iter1093-1099
 * visible-prefix sweep convention に合わせ visible 冒頭固定。
 *
 * 修正 (heartbeat-button.tsx): aria-label pending を "スキャン中… — Heartbeat MUST スキャン実行中"
 * に変更で visible 冒頭固定 + literal substring 復旧。default state は visible "Heartbeat" が既
 * prefix なので維持。
 *
 * HeartbeatButton は実 supabase + auth + workspace 必要、Docker 不在で browser 不能のため
 * source-of-truth 直読 invariant fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-heartbeat-button-pending-iter1100.ts
 * 前提: なし (filesystem 読み込みのみ)
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
  const filePath = resolve(here, '../src/components/workspace/heartbeat-button.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 新 pending aria-label "スキャン中… — Heartbeat MUST スキャン実行中" の存在
  if (!src.includes("'スキャン中… — Heartbeat MUST スキャン実行中'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `HeartbeatButton の pending aria-label が visible-prefix 形式 'スキャン中… — Heartbeat MUST スキャン実行中' でない`,
    })
  }
  // 旧 pending aria-label 'Heartbeat スキャンを実行中…' が残ってないか
  if (src.includes("'Heartbeat スキャンを実行中…'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `旧 pending aria-label 'Heartbeat スキャンを実行中…' が残存 (visible "スキャン中…" が literal substring に含まれない)`,
    })
  }
  // default visible "Heartbeat" は既に aria-label prefix なので維持確認
  // iter1504: ':' → ' — ' migration (iter1226 / iter1498 colon → em-dash sweep)
  if (!src.includes("'Heartbeat — MUST item")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `HeartbeatButton の default aria-label 'Heartbeat — MUST item ...' (visible "Heartbeat" prefix em-dash) が消失`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — HeartbeatButton pending aria-label は visible-prefix 配置済 + default 維持',
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
