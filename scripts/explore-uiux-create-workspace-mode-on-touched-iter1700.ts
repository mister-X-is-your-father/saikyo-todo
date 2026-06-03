/**
 * Phase 6.15 loop iter 1700 — create-workspace-form の useForm mode を 'onTouched'
 * に統一 (sibling 4 form と pattern 揃え)。
 *
 * 課題: src/components/workspace/create-workspace-form.tsx の useForm() は
 *   `mode` 未指定 (default 'onSubmit') で blur 時 inline error が出ない。
 *   sibling 4 form (login / signup / mock-login / mock-submit) は iter255-379
 *   sweep で `mode: 'onTouched'` 採用済、本 form のみ取りこぼしで UX 不整合。
 *   user は submit 押下まで slug pattern 違反 / name 空欄を見られない (WCAG
 *   3.3.1 inline error timing 観点で sibling form と divergent)。
 *
 * fix: `mode: 'onTouched'` を 1 行追加 + 6 line comment (rationale)。機能追加
 *   なし、shadcn 編集なし、影響面 1 ファイル。
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

  const target = 'src/components/workspace/create-workspace-form.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. mode: 'onTouched' が useForm body に存在
  if (!/useForm<CreateWorkspaceInput>\(\{[\s\S]*?mode:\s*'onTouched'/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: mode: 'onTouched' が useForm body に無い`,
    })
  } else {
    findings.push({ level: 'info', message: `create-workspace mode: 'onTouched' OK` })
  }

  // 2. sibling form 4 件で mode: 'onTouched' が維持されていること (regression guard)
  const siblings = [
    'src/components/auth/login-form.tsx',
    'src/components/auth/signup-form.tsx',
    'src/components/mock-timesheet/mock-login-form.tsx',
    'src/components/mock-timesheet/mock-submit-form.tsx',
  ]
  for (const s of siblings) {
    const ssrc = readFileSync(resolve(process.cwd(), s), 'utf8')
    if (!/mode:\s*'onTouched'/.test(ssrc)) {
      findings.push({
        level: 'warning',
        message: `${s}: sibling form の mode: 'onTouched' invariant が壊れた`,
      })
    }
  }

  // 3. iter377 onInvalid handler 維持
  if (!/function onInvalid\(errors:/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: iter377 onInvalid handler invariant が壊れた`,
    })
  }

  console.log(`\n=== Findings (create-workspace-mode-on-touched-iter1700) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
