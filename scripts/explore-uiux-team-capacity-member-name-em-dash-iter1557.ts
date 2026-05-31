/**
 * Phase 6.15 loop iter1557: team-capacity-panel member 名 chip aria-label を visible 冒頭
 * em-dash 形式に migration (iter1093-1556 sweep convention 着地、WCAG 2.5.3 fix)。
 *
 * 旧 aria-label `"member: ${name}"` は visible "${name}" を末尾に持ち voice control prefix-matching
 *「click {name}」 が strict prefix-match で不可 (substring 一致のみ)。iter1553-1556 status/role
 * Badge family と同 pattern、visible 冒頭固定 + em-dash 区切。同 file 内 今日 / 今週 chip は
 * visible "今日" / "今週" が prefix にあり既に prefix-match 可。
 *
 * 修正 (team-capacity-panel.tsx):
 *   `member: ${name}` → `${name} — member`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-team-capacity-member-name-em-dash-iter1557.ts
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
    resolve(here, '../src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label={`${name} — member`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'team-capacity-panel member name aria-label が em-dash 形式 (visible 冒頭) でない',
    })
  }
  if (src.includes('aria-label={`member: ${name}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'team-capacity-panel member name 旧 aria-label (visible 末尾) が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — team-capacity member name aria-label が em-dash 形式 (visible 冒頭固定)')
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
