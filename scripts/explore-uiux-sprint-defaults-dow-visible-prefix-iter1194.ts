/**
 * Phase 6.15 loop iter1194: sprints-panel sprint-defaults-dow select aria-label visible-prefix
 * regression guard。
 *
 * iter1194 で発見した visible-prefix 漏れ (src-kind iter1192 / src-method iter1193 と同 sweep):
 * sprints-panel.tsx `sprint-defaults-dow` select の旧 aria-label
 * `Sprint 基本曜日 (現在: ${DOW_JA[dow]}曜開始)` は visible (option text "{label}曜") を
 * 中位置に持ち voice control prefix-matching「click {曜}」 match 不可 (substring 一致のみ)。
 *
 * 修正 (sprints-panel.tsx): IIFE で visible を先に算出し
 * `${visible} — Sprint 基本曜日 (現在: ${visible}開始)` で先頭固定
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-defaults-dow-visible-prefix-iter1194.ts
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
  const filePath = resolve(here, '../src/components/workspace/sprints-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('`${visible} — Sprint 基本曜日 (現在: ${visible}開始)`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'sprint-defaults-dow aria-label が visible-prefix 形式 "${visible} — Sprint 基本曜日..." でない',
    })
  }
  if (src.includes('`Sprint 基本曜日 (現在: ${DOW_JA[dow] ?? dow}曜開始)`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 prefix-less "Sprint 基本曜日 (現在: ...)" が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sprint-defaults-dow aria-label は visible 冒頭固定済')
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
