/**
 * Phase 6.15 loop iter 847 (mode-D Desktop a11y) —
 * create-workspace-form 「作成」 / 「作成中...」 submit button visible text を
 * aria-hidden span で wrap。
 *
 * 課題: create-workspace-form.tsx 行 112-114 の submit Button visible text
 *   "{isPending ? '作成中...' : '作成'}" は aria-label
 *   "{isPending ? 'Workspace を作成中…' : 'Workspace を新規作成'}" が完全
 *   content を含むのに aria-hidden 無し → SR は visible + aria-label の 2 経路
 *   で読み上げ重複。Workspace 作成は initial onboarding の最重要 entry point
 *   で SR UX 影響大。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter844-846 invariant cross-check。
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
  const hasSubmitAriaHidden =
    /<span aria-hidden="true">\{isPending \? '作成中\.\.\.' : '作成'\}<\/span>/.test(cwf)
  if (hasSubmitAriaHidden) {
    findings.push({
      level: 'info',
      message: `create-workspace submit button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-workspace submit button aria-hidden 不完全`,
    })
  }

  // iter521 invariant: submit Button h-11 / aria-busy / aria-label / data-testid
  if (
    /className="h-11 w-full"/.test(cwf) &&
    /aria-busy=\{isPending \|\| undefined\}/.test(cwf) &&
    /data-testid="create-workspace-submit"/.test(cwf) &&
    /aria-label=\{isPending \? 'Workspace を作成中…' : 'Workspace を新規作成'\}/.test(cwf)
  ) {
    findings.push({
      level: 'info',
      message: `iter521 invariant: create-workspace submit button h-11 + aria-busy + aria-label + data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter521 invariant: 破壊` })
  }

  // iter552 invariant: form aria-label="Workspace 作成フォーム" + data-testid="create-workspace-form"
  if (
    /aria-label="Workspace 作成フォーム"/.test(cwf) &&
    /data-testid="create-workspace-form"/.test(cwf)
  ) {
    findings.push({
      level: 'info',
      message: `iter552 invariant: form aria-label + data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter552 invariant: 破壊` })
  }

  // iter844 invariant: async-states ErrorState retry button aria-hidden
  const asyncStates = readFileSync(
    resolve(process.cwd(), 'src/components/shared/async-states.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">再試行<\/span>/.test(asyncStates)) {
    findings.push({
      level: 'info',
      message: `iter844 invariant: async-states ErrorState retry aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter844 invariant: 破壊` })
  }

  // iter846 invariant: active-timer-panel Stop button aria-hidden
  const atp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">停止<\/span>/.test(atp)) {
    findings.push({
      level: 'info',
      message: `iter846 invariant: active-timer-panel Stop button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter846 invariant: 破壊` })
  }

  // iter843 invariant: item-edit-dialog reload button aria-hidden
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">最新を読み込み<\/span>/.test(ied)) {
    findings.push({
      level: 'info',
      message: `iter843 invariant: item-edit-dialog reload button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter843 invariant: 破壊` })
  }

  console.log(`\n=== Findings (create-workspace-submit-aria-hidden-iter847) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
