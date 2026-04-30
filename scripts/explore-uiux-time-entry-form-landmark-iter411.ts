/**
 * Phase 6.15 loop iter 411 (mode-D Desktop a11y) — create-time-entry-form
 * に aria-label 追加し form landmark 化 (iter256/iter405 pattern を
 * time-entry に水平展開)。
 *
 * 課題: src/components/time-entry/create-time-entry-form.tsx は <form
 *   onSubmit={...} aria-busy={create.isPending || undefined}> で aria-label
 *   / aria-labelledby いずれも無し。HTML5 spec: form 要素は accessible
 *   name を持たないと暗黙 landmark にならない。SR landmark navigation で
 *   form に直行不可、汎用 generic として扱われる。iter256 (auth form
 *   aria-labelledby) + iter405 (mock-timesheet form aria-label) で同 pattern
 *   適用済だが time-entry form は未適用で UX 断絶。
 *
 * fix: 1 file × 1 line addition (aria-label="稼働記録 作成フォーム")。
 *   既存 aria-busy={create.isPending || undefined} 維持、handleSubmit /
 *   noValidate / data-testid 維持。
 *
 *   aria-labelledby ではなく aria-label を使う理由: time-entry form は
 *   workspace 内 panel として複数 page で再利用される可能性があり、特定
 *   h1 への依存を避けて self-contained に role 表現する方が安全。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。視覚的 layout 不変。
 *
 * 検証: source-side regex assert で codify (time-entry page は cloud env
 *   で auth 必須のため browser interaction 不可、static audit で代替)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/time-entry/create-time-entry-form.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. form aria-label
  if (!/aria-label="稼働記録 作成フォーム"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${path}: aria-label="稼働記録 作成フォーム" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `${path}: aria-label OK` })
  }

  // 2. aria-busy 維持 (iter262 pattern)
  if (!/aria-busy=\{create\.isPending \|\| undefined\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${path}: aria-busy が消えた (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: `${path}: aria-busy 維持 OK` })
  }

  // iter256 invariant 維持: auth form aria-labelledby
  for (const p of ['src/components/auth/login-form.tsx', 'src/components/auth/signup-form.tsx']) {
    const s = readFileSync(resolve(process.cwd(), p), 'utf8')
    if (!/aria-labelledby="(login|signup)-heading"/.test(s)) {
      findings.push({
        level: 'warning',
        message: `${p}: iter256 aria-labelledby が消えた (regression)`,
      })
    }
  }

  // iter405 invariant 維持: mock-timesheet form aria-label
  for (const [p, label] of [
    ['src/components/mock-timesheet/mock-login-form.tsx', 'Mock Timesheet ログインフォーム'],
    ['src/components/mock-timesheet/mock-submit-form.tsx', 'Mock Timesheet 工数送信フォーム'],
  ] as const) {
    const s = readFileSync(resolve(process.cwd(), p), 'utf8')
    if (!s.includes(`aria-label="${label}"`)) {
      findings.push({
        level: 'warning',
        message: `${p}: iter405 aria-label="${label}" が消えた (regression)`,
      })
    }
  }

  console.log(`\n=== Findings (time-entry-form-landmark-iter411) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
