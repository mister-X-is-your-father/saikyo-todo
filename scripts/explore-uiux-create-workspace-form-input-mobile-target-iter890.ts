/**
 * Phase 6.15 loop iter 890 (mode-M Mobile audit / iter889 follow-up) —
 * create-workspace-form の 2 Input (name / slug) を min-h-11 に拡張。
 *
 * 課題: workspace 作成 form は最初の onboarding 入力で mobile からも触られる。
 *   shadcn Input h-8 (32px) → WCAG 2.5.8 AAA + iOS 44pt 推奨を満たすため min-h-11 (44px) に統一。
 *
 * fix (1 ファイル 2 行差分):
 *   - name input
 *   - slug input
 *
 * 検証: source-side regex assert + iter889 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const cwf = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  const min11Count = (cwf.match(/className="min-h-11"/g) ?? []).length
  if (min11Count >= 2) {
    findings.push({
      level: 'info',
      message: `create-workspace-form Input min-h-11 適用 OK (${min11Count} 件)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-workspace-form Input min-h-11 件数 ${min11Count} (期待 ≥2)`,
    })
  }

  // iter889 invariant: 3 auth form
  const lf = readFileSync(resolve(process.cwd(), 'src/components/auth/login-form.tsx'), 'utf8')
  if ((lf.match(/className="min-h-11"/g) ?? []).length >= 2) {
    findings.push({
      level: 'info',
      message: `iter889 invariant: login-form min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter889 invariant: 破壊` })
  }

  // iter851 invariant
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: skip-link focus min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  console.log(`\n=== Findings (create-workspace-form-input-mobile-target-iter890) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
