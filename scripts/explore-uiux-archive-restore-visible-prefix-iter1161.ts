/**
 * Phase 6.15 loop iter1161: archived-items-panel archive-restore button aria-label visible-prefix regression guard。
 *
 * iter1161 で発見した visible-prefix 漏れ: archived-items-panel.tsx
 * `archive-restore-${id}` button (visible "{pending? '復元中…' : '復元'}") の
 * 旧 aria-label 2 path とも visible を中位置 ("を 復元中…" / "を 復元 (...) にアーカイブ")
 * に持ち voice control prefix-matching「click 復元 / 復元中…」 match 不可
 * (substring 一致のみ)。iter1093-1160 sweep convention が漏れていた。
 *
 * 修正 (archived-items-panel.tsx): visible 冒頭固定 + em-dash 区切で descriptive 末尾
 *   - pending: `復元中… — 「${item.title}」を復元中…`
 *   - default: `復元 — 「${item.title}」を復元 (${fmt(item.archivedAt)} にアーカイブ)`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-archive-restore-visible-prefix-iter1161.ts
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

  for (const expected of [
    '`復元中… — 「${item.title}」を復元中…`',
    '`復元 — 「${item.title}」を復元 (${fmt(item.archivedAt)} にアーカイブ)`',
  ]) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `archive-restore: 新 visible-prefix ${expected} が source に無い`,
      })
    }
  }
  for (const oldLbl of [
    '`「${item.title}」を復元中…`',
    '`「${item.title}」を復元 (${fmt(item.archivedAt)} にアーカイブ)`',
  ]) {
    if (src.includes(oldLbl)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `archive-restore: 旧 prefix-less ${oldLbl} が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — archive-restore aria-label 2 path とも visible 冒頭固定済')
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
