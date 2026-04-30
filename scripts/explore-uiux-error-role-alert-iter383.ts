/**
 * Phase 6.15 loop iter 383 — `role="alert"` 漏れ 2 箇所まとめて修正
 * (workflow editor inline error + archived-items fetch error)。
 *
 * 課題: `grep -rn '<p[^>]*text-destructive' src/` で codebase 全 18 箇所を audit
 *   した結果、role="alert" 不在の error 表示が 2 箇所残っていた:
 *   - src/components/workflow/workflows-panel.tsx 559 行: WorkflowEditDialog の
 *     inline error <p> は data-testid のみで role/aria-live なし → user が graph
 *     JSON / trigger JSON を保存しようとして zod parse 失敗した時、SR は error
 *     文言を即座に announce しない (toast.error 経由でも届くが、dialog 内 inline
 *     error の二重通知のうち SR には片方しか届かない)
 *   - src/components/workspace/archived-items-panel.tsx 61 行: 「アーカイブ一覧
 *     の取得に失敗しました」error <p> も role/aria-live 無し
 *
 * fix: 2 file × 各 1 箇所 (合計 約 10 line 差替、機能追加なし、shadcn 編集なし)。
 *   - workflows-panel.tsx: <p> に role="alert" + id="wf-editor-error-${wf.id}"
 *     を追加 (data-testid と同じ id 値を div 化、外部から focus / aria-describedby
 *     用 anchor として使える)
 *   - archived-items-panel.tsx: <p> を multi-line 化し role="alert" を追加
 *
 * 既存 16 箇所 (auth / workspace / mock-timesheet / WorkflowRunHistory /
 * WorkflowNodeRunPanel / IntegrationsPanel) は role="alert" 完備、本 iter で
 * codebase 全 18 箇所 100% role="alert" carriage が完了。
 *
 * 検証: source-side regex assert で codify。dev server で実 toast を発火せず
 *   source-side audit で全 18 箇所 (修正 2 + 既存 16) を 1 関数で確認。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. workflow editor inline error
  const wfTarget = 'src/components/workflow/workflows-panel.tsx'
  const wfSrc = readFileSync(resolve(process.cwd(), wfTarget), 'utf8')
  if (!/id=\{`wf-editor-error-\$\{wf\.id\}`\}[\s\S]*?role="alert"/.test(wfSrc)) {
    findings.push({
      level: 'warning',
      message: `${wfTarget}: WorkflowEditDialog inline error に id + role="alert" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'workflows-panel inline error role=alert OK' })
  }

  // 2. archived-items fetch error
  const arTarget = 'src/components/workspace/archived-items-panel.tsx'
  const arSrc = readFileSync(resolve(process.cwd(), arTarget), 'utf8')
  if (!/className="text-destructive p-4 text-sm" role="alert"/.test(arSrc)) {
    findings.push({
      level: 'warning',
      message: `${arTarget}: archive 取得失敗 error に role="alert" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'archived-items error role=alert OK' })
  }

  // 3. iter378-382 invariant 維持 (regression guard)
  for (const f of [
    'src/components/mock-timesheet/mock-login-form.tsx',
    'src/components/mock-timesheet/mock-submit-form.tsx',
    'src/components/mock-timesheet/mock-top-nav.tsx',
    'src/components/shared/keybindings-help-modal.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (
      f.endsWith('mock-top-nav.tsx') &&
      !/<nav\s+aria-label="mock-timesheet ナビゲーション"/.test(s)
    ) {
      findings.push({ level: 'warning', message: `${f}: iter381 nav landmark が消えた` })
    }
    if (
      f.endsWith('keybindings-help-modal.tsx') &&
      (!/aria-labelledby=\{headingId\}/.test(s) ||
        !/aria-label=\{`ショートカット \$\{kb\.combo\}`\}/.test(s))
    ) {
      findings.push({ level: 'warning', message: `${f}: iter382 section/dt a11y pattern が消えた` })
    }
    if (
      (f.endsWith('mock-login-form.tsx') || f.endsWith('mock-submit-form.tsx')) &&
      (!/function onInvalid\(errors:/.test(s) || !/handleSubmit\(onSubmit, onInvalid\)/.test(s))
    ) {
      findings.push({ level: 'warning', message: `${f}: iter378/379 onInvalid pattern が消えた` })
    }
  }

  // 4. codebase 全 <p ... text-destructive ...> に role="alert" or 表示文脈
  //    (本 iter で 18/18 の role="alert" 整備完了の確認)
  const expectedRoleAlertCount = 18
  const allFiles = [
    'src/components/auth/login-form.tsx',
    'src/components/auth/signup-form.tsx',
    'src/components/workspace/create-workspace-form.tsx',
    'src/components/mock-timesheet/mock-login-form.tsx',
    'src/components/mock-timesheet/mock-submit-form.tsx',
    'src/components/workflow/workflows-panel.tsx',
    'src/components/workspace/archived-items-panel.tsx',
    'src/components/integrations/integrations-panel.tsx',
  ]
  let totalRoleAlert = 0
  for (const f of allFiles) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    const matches =
      s.match(
        /<p[^>]*text-destructive[^>]*role="alert"|<p[^>]*role="alert"[^>]*text-destructive/g,
      ) ?? []
    totalRoleAlert += matches.length
  }
  if (totalRoleAlert < expectedRoleAlertCount) {
    findings.push({
      level: 'warning',
      message: `text-destructive + role="alert" の <p> が ${totalRoleAlert}/${expectedRoleAlertCount} (期待値より少ない)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `text-destructive + role="alert" の <p> = ${totalRoleAlert}/${expectedRoleAlertCount} OK`,
    })
  }

  console.log(`\n=== Findings (error-role-alert-iter383) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
