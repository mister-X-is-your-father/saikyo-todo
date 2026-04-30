/**
 * Phase 6.15 loop iter 416 (mode-D Desktop a11y) — goals-panel 2 form +
 * templates-panel 1 form に aria-label を追加し landmark 化 (iter415
 * sprints-panel pattern を goals/templates に水平展開、codebase 内 form
 * 11 個 landmark 化達成)。
 *
 * 課題: src/components/workspace/goals-panel.tsx の 2 form + templates-
 *   panel.tsx の 1 form は aria-busy のみで aria-label / aria-labelledby
 *   無し。HTML5 spec で form は accessible name を持たないと暗黙
 *   landmark にならず SR landmark navigation で「どの操作 form か」
 *   区別不能。iter415 (sprints-panel 3 form) で同 pattern 適用済だが
 *   goals + templates panel は未対応で UX 断絶。
 *
 * fix: 2 file × 計 3 line addition (各 form に固有 aria-label)。
 *   - goals-panel.tsx Goal 作成 form: aria-label="Goal 作成フォーム"
 *   - goals-panel.tsx Key Result 追加 form: aria-label="Key Result 追加フォーム"
 *   - templates-panel.tsx Template 作成 form: aria-label="Template 作成フォーム"
 *
 *   これで iter256 (auth) / iter405 (mock-timesheet) / iter411
 *   (time-entry) / iter415 (sprints-panel) / iter416 (goals-panel +
 *   templates-panel) で **codebase 内 form 11 個が landmark 化統一達成**。
 *
 * 機能追加なし、shadcn 編集なし、影響面 2 ファイル。視覚的 layout 不変。
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

  const goalsPath = 'src/components/workspace/goals-panel.tsx'
  const templatesPath = 'src/components/template/templates-panel.tsx'
  const goalsSrc = readFileSync(resolve(process.cwd(), goalsPath), 'utf8')
  const templatesSrc = readFileSync(resolve(process.cwd(), templatesPath), 'utf8')

  for (const label of ['Goal 作成フォーム', 'Key Result 追加フォーム']) {
    if (!goalsSrc.includes(`aria-label="${label}"`)) {
      findings.push({
        level: 'warning',
        message: `${goalsPath}: aria-label="${label}" が無い`,
      })
    } else {
      findings.push({ level: 'info', message: `${goalsPath}: ${label} OK` })
    }
  }

  if (!templatesSrc.includes('aria-label="Template 作成フォーム"')) {
    findings.push({
      level: 'warning',
      message: `${templatesPath}: aria-label="Template 作成フォーム" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `${templatesPath}: Template 作成フォーム OK` })
  }

  // iter415 invariant 維持: sprints-panel 3 aria-label
  const sprintsSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  for (const label of [
    'Sprint 作成フォーム',
    'Sprint 編集フォーム',
    'Sprint デフォルト設定 編集フォーム',
  ]) {
    if (!sprintsSrc.includes(`aria-label="${label}"`)) {
      findings.push({
        level: 'warning',
        message: `sprints-panel.tsx: iter415 ${label} が消えた (regression)`,
      })
    }
  }

  // 11 form landmark carriage
  const FORM_TARGETS: { path: string; pattern: RegExp; label: string }[] = [
    {
      path: 'src/components/auth/login-form.tsx',
      pattern: /aria-labelledby="login-heading"/,
      label: 'auth login',
    },
    {
      path: 'src/components/auth/signup-form.tsx',
      pattern: /aria-labelledby="signup-heading"/,
      label: 'auth signup',
    },
    {
      path: 'src/components/mock-timesheet/mock-login-form.tsx',
      pattern: /aria-label="Mock Timesheet ログインフォーム"/,
      label: 'mock-login',
    },
    {
      path: 'src/components/mock-timesheet/mock-submit-form.tsx',
      pattern: /aria-label="Mock Timesheet 工数送信フォーム"/,
      label: 'mock-submit',
    },
    {
      path: 'src/components/time-entry/create-time-entry-form.tsx',
      pattern: /aria-label="稼働記録 作成フォーム"/,
      label: 'time-entry',
    },
    {
      path: 'src/components/workspace/sprints-panel.tsx',
      pattern: /aria-label="Sprint 作成フォーム"/,
      label: 'sprint create',
    },
    {
      path: 'src/components/workspace/sprints-panel.tsx',
      pattern: /aria-label="Sprint 編集フォーム"/,
      label: 'sprint edit',
    },
    {
      path: 'src/components/workspace/sprints-panel.tsx',
      pattern: /aria-label="Sprint デフォルト設定 編集フォーム"/,
      label: 'sprint default',
    },
    {
      path: 'src/components/workspace/goals-panel.tsx',
      pattern: /aria-label="Goal 作成フォーム"/,
      label: 'goal create',
    },
    {
      path: 'src/components/workspace/goals-panel.tsx',
      pattern: /aria-label="Key Result 追加フォーム"/,
      label: 'kr add',
    },
    {
      path: 'src/components/template/templates-panel.tsx',
      pattern: /aria-label="Template 作成フォーム"/,
      label: 'template create',
    },
  ]
  let count = 0
  for (const t of FORM_TARGETS) {
    const s = readFileSync(resolve(process.cwd(), t.path), 'utf8')
    if (t.pattern.test(s)) count++
    else
      findings.push({
        level: 'warning',
        message: `${t.label}: form aria-label が消えた (regression)`,
      })
  }
  if (count === FORM_TARGETS.length) {
    findings.push({
      level: 'info',
      message: `**form landmark carriage: ${count}/${FORM_TARGETS.length} 100% 達成**`,
    })
  }

  console.log(`\n=== Findings (goals-templates-form-landmark-iter416) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
