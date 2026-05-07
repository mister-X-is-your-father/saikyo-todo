/**
 * Phase 6.15 loop iter 848 (mode-D Desktop a11y) —
 * quick-add 「作成」 / "..." submit button visible text を aria-hidden span で wrap。
 *
 * 課題: quick-add.tsx 行 176-178 の submit Button visible text
 *   "{create.isPending ? '...' : '作成'}" は aria-label が完全 content
 *   (タイトル + 状態 + Enter shortcut) を含むのに aria-hidden 無し → SR は visible
 *   + aria-label の 2 経路で読み上げ重複。QuickAdd は workspace 起動後 最頻 entry
 *   point で SR UX 影響大。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible text を <span aria-hidden="true"> で wrap (pending / normal 両 state を span 内に保持)
 *
 * 検証: source-side regex assert + iter844-847 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  const hasSubmitAriaHidden =
    /<span aria-hidden="true">\{create\.isPending \? '\.\.\.' : '作成'\}<\/span>/.test(qa)
  if (hasSubmitAriaHidden) {
    findings.push({
      level: 'info',
      message: `quick-add submit button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add submit button aria-hidden 不完全`,
    })
  }

  // iter526 invariant: quick-add submit button data-testid + aria-busy + aria-keyshortcuts + min-h-11
  if (
    /data-testid="quick-add-submit"/.test(qa) &&
    /aria-busy=\{create\.isPending \|\| undefined\}/.test(qa) &&
    /aria-keyshortcuts="Enter"/.test(qa) &&
    /className="min-h-11"/.test(qa)
  ) {
    findings.push({
      level: 'info',
      message: `iter526 invariant: quick-add submit button data-testid + aria-busy + aria-keyshortcuts + min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter526 invariant: 破壊` })
  }

  // iter441 invariant: quick-add preview span aria-hidden (見積 / MUST警告 / AI分解)
  if (
    /<span aria-hidden="true">🕐 \{formatEstimate\(preview\.estimateMinutes\)\}<\/span>/.test(qa) &&
    /<span aria-hidden="true">⚠ <\/span>編集ダイアログで DoD を入れてください/.test(qa) &&
    /<span aria-hidden="true">🧠 <\/span>AI 分解/.test(qa)
  ) {
    findings.push({
      level: 'info',
      message: `iter441 invariant: quick-add preview 3 span aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter441 invariant: 破壊` })
  }

  // iter847 invariant: create-workspace-form submit button aria-hidden
  const cwf = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{isPending \? '作成中\.\.\.' : '作成'\}<\/span>/.test(cwf)) {
    findings.push({
      level: 'info',
      message: `iter847 invariant: create-workspace-form submit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter847 invariant: 破壊` })
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

  console.log(`\n=== Findings (quick-add-submit-aria-hidden-iter848) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
