/**
 * Phase 6.15 loop iter1300: archived-items-panel.tsx archive-title-link aria-label visible-prefix +
 * voice control prefix-matching regression guard。
 *
 * iter1300 で発見した visible-prefix 違反: archived-items-panel.tsx `archive-title-link-${id}` Link
 * の旧 aria-label `「${item.title}」を開く (${date} にアーカイブ)` は visible {item.title}
 * (`<span aria-hidden>{item.title}</span>`) を `「」` 内 position 1 に持ち、voice control
 * prefix-matching「click <title 先頭語>」 match 不可 (substring 一致のみ)。
 *
 * personal-period-view iter1157 / backlog-title iter1158 の convention (visible title 冒頭固定 +
 * em-dash 区切で descriptive 末尾) に揃える。
 *
 * 修正 (archived-items-panel.tsx):
 *   - 旧: `「${item.title}」を開く (${fmt(item.archivedAt)} にアーカイブ)`
 *   - 新: `${item.title} — 開く (${fmt(item.archivedAt)} にアーカイブ済み)`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-archive-title-link-visible-prefix-iter1300.ts
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
  const filePath = resolve(here, '../src/components/workspace/archived-items-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 新 template literal が存在することを確認
  if (
    !src.includes('aria-label={`${item.title} — 開く (${fmt(item.archivedAt)} にアーカイブ済み)`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'archive-title-link aria-label が visible title 冒頭固定 + em-dash convention で無い',
    })
  }

  // 旧 template literal の active code 残存を確認 (comment 内の言及は除外)
  const codeOnly = src
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n')
  if (
    codeOnly.includes(
      'aria-label={`「${item.title}」を開く (${fmt(item.archivedAt)} にアーカイブ)`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        '旧 aria-label `「${item.title}」を開く (${date} にアーカイブ)` (visible title 「」内 position 1、voice control prefix-match 不可) が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — archive-title-link aria-label は visible title 冒頭固定 (voice control prefix-match satisfy)',
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
