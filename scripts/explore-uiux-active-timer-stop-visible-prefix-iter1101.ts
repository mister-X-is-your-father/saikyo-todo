/**
 * Phase 6.15 loop iter1101: ActiveTimerPanel stop button aria-label visible-prefix regression guard。
 *
 * iter1101 で発見した bug: 旧 aria-label "タイマーを停止して稼働記録に保存" / "...作成中…" は
 * visible "停止" を "タイマーを**停止**して" 位置 (middle) に substring 持ち、voice control
 * prefix-matching で「click 停止」 match 不可。iter1093-1100 sweep convention に合わせ visible
 * 冒頭固定。
 *
 * 修正 (active-timer-panel.tsx): aria-label を "停止 — タイマーを停止して稼働記録に保存" /
 * pending "停止 — タイマーを停止して稼働記録を作成中…" に変更。
 *
 * ActiveTimerPanel は実 supabase + auth + workspace 必要、Docker 不在で browser 不能のため
 * source-of-truth 直読 invariant fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-active-timer-stop-visible-prefix-iter1101.ts
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
  const filePath = resolve(here, '../src/components/workspace/active-timer-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 新 visible-prefix 形式の存在
  if (!src.includes("'停止 — タイマーを停止して稼働記録に保存'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `active-timer-panel の stop default aria-label が visible-prefix '停止 — ...' でない`,
    })
  }
  if (!src.includes("'停止 — タイマーを停止して稼働記録を作成中…'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `active-timer-panel の stop pending aria-label が visible-prefix '停止 — ...作成中…' でない`,
    })
  }
  // 旧 visible-substring-not-prefix が残ってないか (bare 'タイマーを停止して...' で始まる aria-label)
  if (src.includes("'タイマーを停止して稼働記録に保存'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `旧 visible-suffix aria-label 'タイマーを停止して稼働記録に保存' が残存`,
    })
  }
  if (src.includes("'タイマーを停止して稼働記録を作成中…'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `旧 visible-suffix aria-label 'タイマーを停止して稼働記録を作成中…' が残存`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — ActiveTimerPanel stop button aria-label は visible-prefix 配置済')
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
