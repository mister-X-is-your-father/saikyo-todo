/**
 * Phase 6.15 loop iter 552 (mode-D Desktop a11y) —
 * CreateWorkspaceForm <form> 要素に aria-label + data-testid を補完。
 *
 * 課題: create-workspace-form.tsx 行 44-49 の <form> 要素は aria-busy のみで
 *   aria-label / aria-labelledby / data-testid 不在。他 form (login / signup /
 *   sprints / templates / decompose-proposals 等) は aria-label="〜フォーム" + data-testid
 *   を持つが本 form のみ漏れ。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-label="Workspace 作成フォーム"
 *   - data-testid="create-workspace-form"
 *
 * iter319 (form 全体 aria-busy) と同 pattern を完成させる。+2 行差分、機能不変、
 * 視覚 layout 不変、shadcn 編集なし、onSubmit / noValidate / className invariant 維持。
 *
 * 検証: source-side regex assert + iter515-551 invariant cross-check。
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

  // 1. form aria-label + data-testid
  if (
    /<form[\s\S]*?aria-label="Workspace 作成フォーム"[\s\S]*?data-testid="create-workspace-form"/.test(
      cwf,
    ) ||
    /<form[\s\S]*?data-testid="create-workspace-form"[\s\S]*?aria-label="Workspace 作成フォーム"/.test(
      cwf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `create-workspace-form.tsx: form aria-label + data-testid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-workspace-form.tsx: form aria-label / data-testid 不在`,
    })
  }

  // 2. iter319 form 全体 aria-busy 維持
  if (/aria-busy=\{isPending \|\| undefined\}/.test(cwf)) {
    findings.push({
      level: 'info',
      message: `create-workspace-form.tsx: iter319 form 全体 aria-busy 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-workspace-form.tsx: iter319 form 全体 aria-busy 破壊`,
    })
  }

  // 3. iter521 invariant: submit Button aria-busy + aria-label + data-testid 維持
  if (
    /data-testid="create-workspace-submit"/.test(cwf) &&
    /aria-label=\{isPending \? 'Workspace を作成中…' : 'Workspace を新規作成'\}/.test(cwf)
  ) {
    findings.push({
      level: 'info',
      message: `iter521 invariant: submit Button aria-label + data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter521 invariant: 破壊`,
    })
  }

  // 4. iter515 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (create-workspace-form-aria-iter552) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
