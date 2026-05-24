/**
 * Phase 6.15 loop iter1204: integrations-panel src-name IMEInput aria-label
 * visible-prefix regression guard。
 *
 * iter1204 で発見した visible-prefix 漏れ (wf-name iter1203 と同 sweep):
 * integrations-panel.tsx `src-name` IMEInput の旧 aria-label (全 4 path)
 * `Source 名前 (...)` は visible Label "名前" を中位置 "Source **名前** (...)" に
 * 持ち voice control prefix-matching「click 名前」 match 不可 (substring 一致のみ)。
 *
 * 修正 (integrations-panel.tsx):
 * 全 4 path とも `名前 — Source 名前 (...)` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-src-name-visible-prefix-iter1204.ts
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

  const expected = [
    "'名前 — Source 名前 (必須、最大 200 文字、識別しやすい名前 — 例: Yamory チーム A)'",
    '`名前 — Source 名前 (現在 ${name.length} / 200 文字、空白のみは不正)`',
    '`名前 — Source 名前 (現在 ${name.length} / 200 文字、上限近接)`',
    '`名前 — Source 名前 (現在 ${name.length} / 200 文字)`',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `src-name aria-label 新 path 欠落: ${e}`,
      })
    }
  }

  const activeCode = src
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
    .join('\n')
  const oldForbidden = [
    "'Source 名前 (必須、最大 200 文字、識別しやすい名前 — 例: Yamory チーム A)'",
    '`Source 名前 (現在 ${name.length} / 200 文字、空白のみは不正)`',
    '`Source 名前 (現在 ${name.length} / 200 文字、上限近接)`',
    '`Source 名前 (現在 ${name.length} / 200 文字)`',
  ]
  for (const o of oldForbidden) {
    if (activeCode.includes(o)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 prefix-less src-name aria-label が active code に残存: ${o}`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — src-name aria-label は visible 冒頭固定済 (全 4 path)')
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
