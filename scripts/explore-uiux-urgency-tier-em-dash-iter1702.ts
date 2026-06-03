/**
 * Phase 6.15 loop iter 1702 — dashboard-view の urgency-tiers chip detail
 * aria-label の `全体:` colon を撤去 (iter1629 / iter1701 sweep 取りこぼし)。
 *
 * 課題: src/components/workspace/dashboard-view.tsx 832 行 urgency-tiers chip の
 *   detail (= aria-label / title) が `${visible} — 全体: ${counts} — ${titles}`
 *   形式で em-dash 区切後の descriptor 部に colon `:` 残存。iter1626-1629 sweep
 *   (StatusBadge `ステータス: ${X}` → `ステータス ${X}`) / iter1701 (sync badge
 *   `外部同期: ${state}` → `外部同期 ${state}`) と divergent。
 *
 * fix: `全体: ${X}` → `全体 ${X}` (1 line 差替 + 5 line comment)。visible 部の
 *   `要対応:` は UI chip text 内で長く visible として存在 → 互換性のため scope 外。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const target = 'src/components/workspace/dashboard-view.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. 旧 colon パターン不在
  if (/— 全体: \$\{formatUrgencyTierCounts\(counts\)\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: 旧 \`— 全体: \${X}\` colon が残存`,
    })
  } else {
    findings.push({ level: 'info', message: 'urgency-tiers `全体:` colon 撤去 OK' })
  }

  // 2. 新 em-dash convention 存在
  if (!/— 全体 \$\{formatUrgencyTierCounts\(counts\)\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: 新 \`— 全体 \${X}\` em-dash convention が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'urgency-tiers `全体 ${X}` em-dash OK' })
  }

  // 3. visible 部の `要対応:` は scope 外 (UI 互換性) — 維持されていること
  if (!/const visible = `要対応: \$\{actionable\.join/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: visible \`要対応:\` (UI chip text) が消えた`,
    })
  }

  // 4. iter1701 time-entries-table sync badge invariant
  const timeEntries = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )
  for (const s of [
    'aria-label="synced — 外部同期 完了"',
    'aria-label="failed — 外部同期 失敗"',
    'aria-label="pending — 外部同期 未実行"',
  ]) {
    if (!timeEntries.includes(s)) {
      findings.push({
        level: 'warning',
        message: `time-entries-table.tsx: iter1701 invariant が壊れた (${s})`,
      })
    }
  }

  console.log(`\n=== Findings (urgency-tier-em-dash-iter1702) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
