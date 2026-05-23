/**
 * Phase 6.15 loop iter1197: templates-panel tmpl-kind select aria-label visible-prefix
 * regression guard。
 *
 * iter1197 で発見した visible-prefix 漏れ (src-kind iter1192 / kr-mode iter1196 と同 sweep):
 * templates-panel.tsx `tmpl-kind` select の旧 aria-label
 * `Template 種別 (現在: manual — ...)` は visible (option text "manual (手動展開)" /
 * "recurring (cron で自動展開)") を中位置に持ち voice control prefix-matching
 *「click manual / recurring」 match 不可 (substring 一致のみ)。
 *
 * 修正 (templates-panel.tsx): IIFE で visible を先に算出し
 * `${visible} — Template 種別 (現在: ${visible})` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-tmpl-kind-visible-prefix-iter1197.ts
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

  if (!src.includes('`${visible} — Template 種別 (現在: ${visible})`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'tmpl-kind aria-label が visible-prefix 形式 "${visible} — Template 種別..." でない',
    })
  }
  if (src.includes('`Template 種別 (現在: ${')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "Template 種別 (現在: ...)" が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — tmpl-kind aria-label は visible 冒頭固定済')
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
