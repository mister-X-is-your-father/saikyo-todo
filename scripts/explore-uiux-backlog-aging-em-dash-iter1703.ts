/**
 * Phase 6.15 loop iter 1703 — dashboard-view の backlog-aging chip ariaLabel の
 * 2 colon を撤去 (iter1629 / iter1701 / iter1702 sweep の 3 弾目)。
 *
 * 課題: src/components/workspace/dashboard-view.tsx 1232 行 backlog-aging chip の
 *   ariaLabel `${aging.hintLabel}: Backlog 年齢: ${aging.summary}${...}` には
 *   colon `:` が 2 箇所残存。同行 1233 行 `title` は既に em-dash convention 採用済
 *   (`${aging.hintLabel} — ${aging.summary}`) で、aria-label のみ取りこぼし。
 *   visible 部の `Backlog:` colon は UI chip text 内 visible なので互換性で
 *   scope 外 (visible UI 不変)。
 *
 * fix: `${hintLabel}: Backlog 年齢: ${summary}` → `${hintLabel} — Backlog 年齢
 *   ${summary}` (1 line 差替 + 5 line comment)。title attribute と pattern 整合、
 *   SR 読み上げが iter1701 sync badge / iter1702 urgency-tiers chip family と整合。
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

  // 1. 旧 2-colon ariaLabel 不在
  if (/\$\{aging\.hintLabel\}: Backlog 年齢: \$\{aging\.summary\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: 旧 \`${'$'}{hintLabel}: Backlog 年齢: ${'$'}{summary}\` 2 colon が残存`,
    })
  } else {
    findings.push({ level: 'info', message: 'backlog-aging 旧 2 colon 撤去 OK' })
  }

  // 2. 新 em-dash convention 存在
  if (!/\$\{aging\.hintLabel\} — Backlog 年齢 \$\{aging\.summary\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: 新 em-dash convention ariaLabel が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'backlog-aging 新 em-dash ariaLabel OK' })
  }

  // 3. title attribute invariant 維持 (iter1701-1702 と同様 em-dash convention で既に統一済)
  if (!/title=\{`\$\{aging\.hintLabel\} — \$\{aging\.summary\}`\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: title attribute em-dash convention invariant が壊れた`,
    })
  }

  // 4. iter1702 urgency-tiers chip invariant (regression guard)
  if (!/— 全体 \$\{formatUrgencyTierCounts\(counts\)\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: iter1702 urgency-tiers \`全体 \${X}\` invariant が壊れた`,
    })
  }

  // 5. iter1701 time-entries-table sync badge invariant
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

  console.log(`\n=== Findings (backlog-aging-em-dash-iter1703) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
