/**
 * Phase 6.15 loop iter 415 (mode-D Desktop a11y) — sprints-panel.tsx
 * 3 form (Sprint 作成 / Sprint 編集 / Sprint デフォルト設定 編集) に
 * aria-label を追加し form landmark 化 (iter256/iter405/iter411 pattern
 * を sprints-panel に水平展開)。
 *
 * 課題: src/components/workspace/sprints-panel.tsx の 3 form は
 *   `aria-busy={...isPending || undefined}` のみで aria-label /
 *   aria-labelledby いずれも無し。HTML5 spec で form は accessible name
 *   を持たないと暗黙 landmark にならず SR landmark navigation で 3 form
 *   が generic group として並んで「どの操作をする form か」区別不能。
 *   iter256 (auth) / iter405 (mock-timesheet) / iter411 (time-entry) で
 *   同 pattern 適用済だが workspace 内 panel 系 form は未対応で UX 断絶。
 *
 * fix: 1 file × 3 line addition (各 form に固有 aria-label)。
 *   - Sprint 作成 form (line ~192): aria-label="Sprint 作成フォーム"
 *   - Sprint 編集 form (line ~493): aria-label="Sprint 編集フォーム"
 *   - Sprint デフォルト設定 編集 form (line ~785):
 *     aria-label="Sprint デフォルト設定 編集フォーム"
 *
 *   3 form 役割 (作成 / 編集 / デフォルト設定) を SR で明確化、landmark
 *   navigation で目的の form に直行可能に。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。視覚的 layout 不変。
 *
 * 検証: source-side regex assert で codify (sprints-panel は workspace
 *   page で auth 必須、static audit で代替)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/sprints-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  for (const label of [
    'Sprint 作成フォーム',
    'Sprint 編集フォーム',
    'Sprint デフォルト設定 編集フォーム',
  ]) {
    if (!src.includes(`aria-label="${label}"`)) {
      findings.push({
        level: 'warning',
        message: `${path}: aria-label="${label}" が無い`,
      })
    } else {
      findings.push({ level: 'info', message: `${path}: ${label} OK` })
    }
  }

  // aria-busy 維持
  const busyCount = (src.match(/aria-busy=\{[^}]+\.isPending \|\| undefined\}/g) || []).length
  if (busyCount < 3) {
    findings.push({
      level: 'warning',
      message: `${path}: aria-busy 数 = ${busyCount} (期待 3)`,
    })
  } else {
    findings.push({ level: 'info', message: `${path}: aria-busy ${busyCount} 維持 OK` })
  }

  // iter256 / iter405 / iter411 invariant 維持
  const checks: { p: string; pat: RegExp; reason: string }[] = [
    {
      p: 'src/components/auth/login-form.tsx',
      pat: /aria-labelledby="login-heading"/,
      reason: 'iter256 auth labelledby',
    },
    {
      p: 'src/components/mock-timesheet/mock-login-form.tsx',
      pat: /aria-label="Mock Timesheet ログインフォーム"/,
      reason: 'iter405 mock-login',
    },
    {
      p: 'src/components/time-entry/create-time-entry-form.tsx',
      pat: /aria-label="稼働記録 作成フォーム"/,
      reason: 'iter411 time-entry',
    },
  ]
  for (const { p, pat, reason } of checks) {
    const s = readFileSync(resolve(process.cwd(), p), 'utf8')
    if (!pat.test(s)) {
      findings.push({
        level: 'warning',
        message: `${p}: ${reason} が消えた (regression)`,
      })
    }
  }

  console.log(`\n=== Findings (sprints-panel-form-landmark-iter415) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
