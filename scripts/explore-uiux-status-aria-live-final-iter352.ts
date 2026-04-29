/**
 * Phase 6.15 loop iter 352 — 残 11 箇所の `role="status"` に `aria-live="polite"`
 * を batch 追加、iter351 続編 (sweep 完結)。
 *
 * 影響面: activity-log (2 件) / budget-panel (1 件) / subtasks-panel (2 件) /
 *   notification-bell (1 件) / integrations-panel (1 件) / workflows-panel (2 件) /
 *   top-items-by-time-chip (3 件)。これで codebase 全 role="status" に
 *   aria-live="polite" 明示済 (cross-SR 互換性 100%)。
 *
 * fix: 各 `role="status"` の隣に `aria-live="polite"` を追加 (12 箇所、12 行追加)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 7 ファイル。
 *
 * 検証: source-side regex assert (codebase 全 sweep)。
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const files = execSync("grep -rl 'role=\"status\"' src/components --include='*.tsx' || true", {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)

  let totalStatus = 0
  let totalWithAriaLive = 0
  for (const f of files) {
    const src = readFileSync(resolve(process.cwd(), f), 'utf8')
    const lines = src.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? ''
      if (!/role="status"/.test(line)) continue
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue
      totalStatus++
      // collect chunk
      let chunk = ''
      let j = i
      while (j < i + 6 && !chunk.includes('>')) {
        chunk += (lines[j] ?? '') + ' '
        j++
      }
      if (/aria-live=/.test(chunk)) totalWithAriaLive++
    }
  }
  findings.push({
    level: 'info',
    message: `codebase sweep: role="status" 計 ${totalStatus} 件中 ${totalWithAriaLive} 件に aria-live`,
  })
  if (totalStatus !== totalWithAriaLive) {
    findings.push({
      level: 'warning',
      message: `残 ${totalStatus - totalWithAriaLive} 件は aria-live 不在`,
    })
  }

  console.log(`\n=== Findings (status-aria-live-final-iter352) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
