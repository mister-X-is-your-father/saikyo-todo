/**
 * Phase 6.15 loop iter1192: integrations-panel src-kind select aria-label visible-prefix
 * regression guard。
 *
 * iter1192 で発見した visible-prefix 漏れ (filter-status iter1182 / gantt-zoom iter1190 /
 * teCategory iter1191 と同 sweep): integrations-panel.tsx `src-kind` select の旧
 * aria-label `Source 種別 (現在: custom-rest — ...)` は visible (option text
 * "custom-rest (汎用 REST)" / "yamory (脆弱性管理)") を中位置に持ち voice control
 * prefix-matching「click custom-rest / yamory」 match 不可。
 *
 * 修正 (integrations-panel.tsx): IIFE で visible を先に算出し
 * `${visible} — Source 種別 (現在: ${visible})` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-src-kind-visible-prefix-iter1192.ts
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
  const filePath = resolve(here, '../src/components/integrations/integrations-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('`${visible} — Source 種別 (現在: ${visible})`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'src-kind aria-label が visible-prefix 形式 "${visible} — Source 種別..." でない',
    })
  }
  if (src.includes('`Source 種別 (現在: ${')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "Source 種別 (現在: ...)" が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — src-kind aria-label は visible 冒頭固定済')
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
