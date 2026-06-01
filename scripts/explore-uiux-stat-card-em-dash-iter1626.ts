/**
 * Phase 6.15 loop iter1626: dashboard-view StatCard ariaLabel `${label}: ${value} (${toneText})`
 * colon + paren convention を iter1093-1620 sweep の em-dash 区切に統一。
 *
 * iter1620 mature 報告で見逃した dynamic template (Phase 6.15 iter 80 由来) を回収。
 * 4 StatCard tile (MUST 件数 / 期限超過 / 完了率 etc) を SR が `Label: 5 (要対応)` から
 * `Label — 5 / 要対応` で読み上げる convention に一致させる。
 *
 * 修正 (dashboard-view.tsx):
 *   - `${label}: ${value} (${toneText})` → `${label} — ${value} / ${toneText}`
 *   - `${label}: ${value}` → `${label} — ${value}`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-stat-card-em-dash-iter1626.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/dashboard-view.tsx'), 'utf8')

  // 1. 新 em-dash convention が両 branch に着地
  if (!src.includes('toneText ? `${label} — ${value} / ${toneText}` : `${label} — ${value}`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'StatCard ariaLabel が em-dash + slash convention に未統一',
    })
  }

  // 2. 旧 colon + paren convention が StatCard ariaLabel 計算行に残存していない
  //    (iter1626 改訂コメント内に旧 literal が history として埋め込まれているため、
  //    code 行 `const ariaLabel = ...` 単独で判定する)
  const ariaLabelLine = src.split('\n').find((l) => l.trim().startsWith('const ariaLabel =')) ?? ''
  if (ariaLabelLine.includes('`${label}: ${value} (${toneText})`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'StatCard 旧 colon + paren convention が ariaLabel 計算行に残存',
    })
  }
  if (ariaLabelLine.includes('`${label}: ${value}`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'StatCard 旧 colon-only convention が ariaLabel 計算行に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — StatCard ariaLabel が em-dash + slash convention で統一 (両 branch)')
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
