/**
 * Phase 6.15 loop iter 341 — subtasks-panel (3 button: indent/outdent ×2 + bulk-add)
 * + template-items-editor (2 button: add + remove) + instantiate-form (1 button:
 * 即実行) + templates-panel (2 button: create + delete) + time-entry (2 button:
 * create + sync) に aria-busy を batch 付与、iter334-340 続編 (Button aria-busy
 * sweep の 42-51 件目達成、累計 51 button 全制覇方向)。
 *
 * fix: 各 button の disabled の隣に `aria-busy={X.isPending || undefined}` を追加
 *   (10 箇所, 10 行追加)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 6 ファイル。
 *
 * 検証: source-side regex assert で codify。
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

  for (const [path, expected] of [
    ['src/components/workspace/subtasks-panel.tsx', ['movePending', 'create.isPending']],
    [
      'src/components/template/template-items-editor.tsx',
      ['addMut.isPending', 'removeMut.isPending'],
    ],
    ['src/components/template/instantiate-form.tsx', ['mut.isPending']],
    ['src/components/template/templates-panel.tsx', ['createMut.isPending', 'deleteMut.isPending']],
    ['src/components/time-entry/create-time-entry-form.tsx', ['create.isPending']],
    ['src/components/time-entry/time-entries-table.tsx', ['sync.isPending']],
  ] as const) {
    const src = readFileSync(resolve(process.cwd(), path), 'utf8')
    for (const expr of expected) {
      const re = new RegExp(`aria-busy=\\{${expr.replace('.', '\\.')} \\|\\| undefined\\}`)
      if (!re.test(src)) {
        findings.push({
          level: 'warning',
          message: `${path}: aria-busy=${expr} 不在`,
        })
      }
    }
  }

  // sweep 全体: codebase 内 disabled={X.isPending} 系 button 全数 vs aria-busy 付き数
  const grepOut = execSync(
    "grep -rEn 'disabled=\\{[^}]*Pending' src/components --include='*.tsx' || true",
    { encoding: 'utf8' },
  )
  const totalDisabled = grepOut.split('\n').filter((l) => l.length > 0).length
  // aria-busy = X.isPending を持つ行
  const ariaBusyOut = execSync(
    "grep -rEn 'aria-busy=\\{[^}]*Pending' src/components --include='*.tsx' || true",
    { encoding: 'utf8' },
  )
  const totalAriaBusy = ariaBusyOut.split('\n').filter((l) => l.length > 0).length
  findings.push({
    level: 'info',
    message: `codebase sweep: disabled w/ Pending=${totalDisabled}, aria-busy w/ Pending=${totalAriaBusy}`,
  })

  console.log(`\n=== Findings (subtasks-template-time-aria-busy-iter341) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
