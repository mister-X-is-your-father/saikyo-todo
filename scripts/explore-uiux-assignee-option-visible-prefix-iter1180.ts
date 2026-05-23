/**
 * Phase 6.15 loop iter1180: assignee-picker assignee-option (CommandItem) aria-label visible-prefix
 * regression guard (user + AI Agent 計 4 path)。
 *
 * iter1180 で発見した visible-prefix 漏れ: assignee-picker.tsx
 * `assignee-option-${m.userId}` (user) + `assignee-option-agent-${a.role}` (AI Agent)
 * CommandItem (visible "{label}" in span aria-hidden) の旧 aria-label 4 path とも visible
 * "{label}" を中位置「「**{label}**」」/「AI Agent「**{label}**」」に持ち voice control
 * prefix-matching「click {label}」 match 不可 (substring 一致のみ)。iter1123 trigger 同
 * pattern を option にも展開すべきだったが漏れていた。
 *
 * 修正 (assignee-picker.tsx): user / AI Agent 各 2 path とも visible 冒頭固定 + em-dash 区切
 *   - user checked:    `${label} — アサイン中 (クリックで解除)`
 *   - user unchecked:  `${label} — アサインする`
 *   - agent checked:   `${label} — AI Agent アサイン中 (クリックで解除)`
 *   - agent unchecked: `${label} — AI Agent をアサイン`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-assignee-option-visible-prefix-iter1180.ts
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
  const filePath = resolve(here, '../src/components/workspace/assignee-picker.tsx')
  const src = readFileSync(filePath, 'utf8')

  for (const expected of [
    '`${label} — アサイン中 (クリックで解除)`',
    '`${label} — アサインする`',
    '`${label} — AI Agent アサイン中 (クリックで解除)`',
    '`${label} — AI Agent をアサイン`',
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `assignee-option: 新 visible-prefix ${expected} が source に無い`,
      })
    }
  }
  for (const oldLbl of [
    '`「${label}」をアサイン中 (クリックで解除)`',
    '`「${label}」をアサインする`',
    '`AI Agent「${label}」をアサイン中 (クリックで解除)`',
    '`AI Agent「${label}」をアサインする`',
  ]) {
    if (src.includes(oldLbl)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `assignee-option: 旧 prefix-less ${oldLbl} が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — assignee-option 4 path とも visible "{label}" 冒頭固定済 (user + AI Agent)',
    )
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
