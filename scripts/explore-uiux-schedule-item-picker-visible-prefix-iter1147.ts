/**
 * Phase 6.15 loop iter1147: schedule-item-picker button aria-label visible-prefix regression guard。
 *
 * iter1147 で発見した visible-prefix 漏れ: schedule-item-picker.tsx (schedule-picker-list 内の
 * item button) の旧 aria-label `item「title」を選択${MUST?' (MUST)':''}` は visible title を
 * 中位置 (位置 5 "item「**title**」を選択") に持ち voice control prefix-matching「click {title}」
 * match 不可 (substring としては存在するが iter1093-1146 sweep convention は visible 冒頭固定が原則)。
 *
 * 修正 (schedule-item-picker.tsx): visible title 冒頭固定 + em-dash 区切で descriptive 末尾保持
 *   - 新: `${title} — item を選択${MUST?' (MUST)':''}`
 *   - 旧: `item「${title}」を選択${MUST?' (MUST)':''}`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-schedule-item-picker-visible-prefix-iter1147.ts
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
  const filePath = resolve(here, '../src/components/schedule/schedule-item-picker.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes('`${it.title} — item を選択${it.isMust ?')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'schedule-item-picker button aria-label が visible-prefix 形式 "${title} — ..." でない',
    })
  }
  if (src.includes('`item「${it.title}」を選択${it.isMust ?')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 aria-label `item「title」を選択` (visible 中位置) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — schedule-item-picker button aria-label は visible title 冒頭固定済')
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
