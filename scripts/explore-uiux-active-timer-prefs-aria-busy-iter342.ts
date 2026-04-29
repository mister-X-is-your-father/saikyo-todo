/**
 * Phase 6.15 loop iter 342 — active-timer-panel (2 button: PiP open/close +
 * Stop) + notification-preferences (4 checkbox toggle) に aria-busy を batch
 * 付与、iter334-341 続編 (Button aria-busy sweep の 52-57 件目達成、累計 57)。
 *
 * fix: 各 button / input の disabled の隣に aria-busy 追加 (3 箇所; ToggleSpec
 *   は map なので 1 行で 4 toggle 全部対応)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 2 ファイル。
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

  const at = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  for (const expr of ['pipPending', 'create.isPending']) {
    const re = new RegExp(`aria-busy=\\{${expr.replace('.', '\\.')} \\|\\| undefined\\}`)
    if (!re.test(at)) {
      findings.push({
        level: 'warning',
        message: `active-timer-panel.tsx: aria-busy=${expr} 不在`,
      })
    }
  }

  const np = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-preferences.tsx'),
    'utf8',
  )
  if (!/aria-busy=\{update\.isPending \|\| undefined\}/.test(np)) {
    findings.push({
      level: 'warning',
      message: 'notification-preferences.tsx: update.isPending aria-busy 不在',
    })
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: '3 button/input aria-busy 全付与 OK' })
  }

  console.log(`\n=== Findings (active-timer-prefs-aria-busy-iter342) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
