/**
 * Phase 6.15 loop iter 414 (mode-M Mobile audit) — CreateTimeEntryForm
 * 記録 button を 44x44 tap target に拡大、codebase 全 7 form button
 * sweep 達成 (iter408+409+410+413+414)。
 *
 * 課題: src/components/time-entry/create-time-entry-form.tsx の <Button
 *   type="submit"> は className 不指定で shadcn default h-8 = 32px を
 *   継承し mobile WCAG 2.5.5 違反。time-entry 記録 form は workspace の
 *   日次稼働入力で頻繁に使われる core flow、submit ミスタップは UX
 *   悪化を直撃する。
 *
 * fix: 1 file × 1 line addition (className="h-11 px-4")。
 *   既存 iter255 pending aria-label / aria-busy / data-testid /
 *   iter411 aria-label 維持。
 *
 *   結果: button 44px tall。これで iter408+409+410+413+414 で **7 form
 *   (login / signup / mock-login / mock-submit / offline retry /
 *   create-workspace / time-entry) の submit button が 44x44 tap target
 *   統一達成**、codebase 内 全 form の mobile UX completeness 完備。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex assert で codify (workspace time-entry page は
 *   cloud env で auth 必須、static audit で代替)。
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

  // 1. submit Button has h-11 px-4
  const submitMatch = src.match(/<Button[\s\S]*?type="submit"[\s\S]*?<\/Button>/)
  if (!submitMatch) {
    findings.push({ level: 'warning', message: `${path}: submit Button block 不在` })
  } else if (!/className="h-11 px-4"/.test(submitMatch[0])) {
    findings.push({
      level: 'warning',
      message: `${path}: submit Button に className="h-11 px-4" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `${path}: h-11 px-4 OK` })
  }

  // iter411 invariant 維持: form aria-label
  if (!/aria-label="稼働記録 作成フォーム"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${path}: iter411 form aria-label が消えた (regression)`,
    })
  }

  // iter255 invariant 維持: button pending aria-label
  if (!/aria-label=\{create\.isPending \? '稼働記録を作成中…' : '稼働記録を作成'\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${path}: iter255 pending aria-label が消えた (regression)`,
    })
  }

  // 7 form button h-11 carriage 100% verification
  const FORM_TARGETS: { path: string; pattern: RegExp; label: string }[] = [
    {
      path: 'src/app/~offline/retry-button.tsx',
      pattern: /className="h-11 px-4"/,
      label: 'offline retry',
    },
    {
      path: 'src/components/auth/login-form.tsx',
      pattern: /className="h-11 w-full"/,
      label: 'auth login',
    },
    {
      path: 'src/components/auth/signup-form.tsx',
      pattern: /className="h-11 w-full"/,
      label: 'auth signup',
    },
    {
      path: 'src/components/mock-timesheet/mock-login-form.tsx',
      pattern: /className="h-11 w-full"/,
      label: 'mock-login',
    },
    {
      path: 'src/components/mock-timesheet/mock-submit-form.tsx',
      pattern: /className="h-11 w-full"/,
      label: 'mock-submit',
    },
    {
      path: 'src/components/workspace/create-workspace-form.tsx',
      pattern: /className="h-11 w-full"/,
      label: 'create-workspace',
    },
    {
      path: 'src/components/time-entry/create-time-entry-form.tsx',
      pattern: /className="h-11 px-4"/,
      label: 'time-entry',
    },
  ]
  let formCarriageCount = 0
  for (const t of FORM_TARGETS) {
    const s = readFileSync(resolve(process.cwd(), t.path), 'utf8')
    if (t.pattern.test(s)) formCarriageCount++
    else
      findings.push({
        level: 'warning',
        message: `${t.label} (${t.path}): h-11 が消えた (regression)`,
      })
  }
  if (formCarriageCount === FORM_TARGETS.length) {
    findings.push({
      level: 'info',
      message: `**7 form button h-11 carriage 100% 達成** (${formCarriageCount}/${FORM_TARGETS.length})`,
    })
  }

  console.log(`\n=== Findings (mobile-time-entry-tap-iter414) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
