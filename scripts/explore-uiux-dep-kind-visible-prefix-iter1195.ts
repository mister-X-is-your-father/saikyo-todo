/**
 * Phase 6.15 loop iter1195: item-dependencies-panel dep-kind select aria-label visible-prefix
 * regression guard。
 *
 * iter1195 で発見した visible-prefix 漏れ (src-kind iter1192 / sprint-defaults-dow iter1194 と
 * 同 sweep): item-dependencies-panel.tsx `dep-kind` select の旧 aria-label
 * `依存の種類 (現在: 前提条件 ...)` は visible (option text "前提条件 (上流)" / "関連") を
 * 中位置 "(現在: ...)" 内に持ち voice control prefix-matching「click 前提条件 / 関連」 match 不可
 * (substring 一致のみ)。
 *
 * 修正 (item-dependencies-panel.tsx): IIFE で visible を先に算出し
 * `${visible} — 依存の種類 (現在: ${visible})` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-dep-kind-visible-prefix-iter1195.ts
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
  const filePath = resolve(here, '../src/components/workspace/item-dependencies-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('`${visible} — 依存の種類 (現在: ${visible})`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'dep-kind aria-label が visible-prefix 形式 "${visible} — 依存の種類..." でない',
    })
  }
  if (src.includes('`依存の種類 (現在: ${')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "依存の種類 (現在: ...)" が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — dep-kind aria-label は visible 冒頭固定済')
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
