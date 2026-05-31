/**
 * Phase 6.15 loop iter1556: workspace-header workspace-role Badge aria-label を visible 冒頭
 * em-dash 形式に migration (iter1093-1555 sweep convention 着地、WCAG 2.5.3 fix)。
 *
 * 旧 aria-label `"あなたの workspace role: ${role}"` は visible "${role}" (e.g., "owner" / "admin" /
 * "member") を末尾に持ち voice control prefix-matching「click owner」 / SR landmark navigation の
 * prefix scan が strict prefix-match で不可 (substring 一致のみ)。iter1553/1554/1555 status Badge
 * family と同 pattern、visible 冒頭固定 + em-dash 区切。
 *
 * 修正 (workspace-header.tsx):
 *   `あなたの workspace role: ${role}` → `${role} — あなたの workspace role`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-workspace-role-badge-em-dash-iter1556.ts
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
  const src = readFileSync(
    resolve(here, '../src/components/workspace/workspace-header.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label={`${role} — あなたの workspace role`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'workspace-header workspace-role Badge aria-label が em-dash 形式 (visible 冒頭) でない',
    })
  }
  if (src.includes('aria-label={`あなたの workspace role: ${role}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace-header workspace-role Badge 旧 aria-label (visible 末尾) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — workspace-role Badge aria-label が em-dash 形式 (visible 冒頭固定)')
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
