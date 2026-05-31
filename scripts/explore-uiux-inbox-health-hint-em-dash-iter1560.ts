/**
 * Phase 6.15 loop iter1560: inbox-view health chip aria-label を visible 冒頭 em-dash 形式に
 * migration (iter1093-1559 sweep convention 着地、WCAG 2.5.3 fix)。
 *
 * 旧 aria-label `"Inbox 健全性: ${healthChip.label}"` は visible "${label}" (e.g., "健全" /
 * "停滞" / "要整理") を末尾に持ち voice control prefix-matching「click 健全」 が strict
 * prefix-match で不可 (substring 一致のみ)。iter1553-1559 status/role/health Badge family と
 * 同 pattern、visible 冒頭固定 + em-dash 区切。
 *
 * 修正 (inbox-view.tsx):
 *   `Inbox 健全性: ${healthChip.label}` → `${healthChip.label} — Inbox 健全性`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-inbox-health-hint-em-dash-iter1560.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/inbox-view.tsx'), 'utf8')

  if (!src.includes('aria-label={`${healthChip.label} — Inbox 健全性`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'inbox-view health chip aria-label が em-dash 形式 (visible 冒頭) でない',
    })
  }
  if (src.includes('aria-label={`Inbox 健全性: ${healthChip.label}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'inbox-view health chip 旧 aria-label (visible 末尾) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — inbox-view health chip aria-label が em-dash 形式 (visible 冒頭固定)')
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
