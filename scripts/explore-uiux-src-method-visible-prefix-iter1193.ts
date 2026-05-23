/**
 * Phase 6.15 loop iter1193: integrations-panel src-method select aria-label visible-prefix
 * regression guard。
 *
 * iter1193 で発見した visible-prefix 漏れ (src-kind iter1192 と同 sweep):
 * integrations-panel.tsx `src-method` select の旧 aria-label
 * `HTTP メソッド (現在: GET — ...)` は visible (option text "GET" / "POST") を中位置
 * "(現在: ...)" 内に持ち voice control prefix-matching「click GET / POST」 match 不可
 * (substring 一致のみ)。
 *
 * 修正 (integrations-panel.tsx): IIFE で visible を先に算出し
 * `${visible} — HTTP メソッド (現在: ${visible})` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-src-method-visible-prefix-iter1193.ts
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

  if (!src.includes('`${visible} — HTTP メソッド (現在: ${visible})`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'src-method aria-label が visible-prefix 形式 "${visible} — HTTP メソッド..." でない',
    })
  }
  if (src.includes('`HTTP メソッド (現在: ${')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "HTTP メソッド (現在: ...)" が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — src-method aria-label は visible 冒頭固定済')
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
