/**
 * Phase 6.15 loop iter 844 (mode-D Desktop a11y) —
 * async-states ErrorState 「再試行」 button visible text を aria-hidden span で wrap。
 *
 * 課題: async-states.tsx 行 102-104 の ErrorState retry button visible text "再試行" は
 *   aria-label `「${message}」をクリアして再試行` が完全 content を含むのに
 *   aria-hidden 無し → SR は「再試行」 + aria-label の 2 経路で読み上げ重複。
 *   ErrorState は全 view error fallback の core component で全 view 横断で
 *   発火する高頻度 button、SR UX 影響大。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible text "再試行" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735-843 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const asyncStates = readFileSync(
    resolve(process.cwd(), 'src/components/shared/async-states.tsx'),
    'utf8',
  )
  const hasRetryAriaHidden = /<span aria-hidden="true">再試行<\/span>/.test(asyncStates)
  if (hasRetryAriaHidden) {
    findings.push({
      level: 'info',
      message: `async-states ErrorState retry button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `async-states ErrorState retry button aria-hidden 不完全`,
    })
  }

  // ErrorState 既存 invariant (iter161 / iter512):
  //  - role="alert" 維持
  //  - retry Button: variant="outline" + size="sm" + min-h-11 + aria-label に message inject
  if (
    /role="alert"/.test(asyncStates) &&
    /variant="outline"\s+size="sm"\s+className="min-h-11"/.test(asyncStates) &&
    /aria-label=\{`「\$\{message\}」をクリアして再試行`\}/.test(asyncStates)
  ) {
    findings.push({
      level: 'info',
      message: `iter161 + iter512 invariant: ErrorState alert + retry size + aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter161/iter512 invariant: 破壊` })
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

  // iter842 invariant: decompose-proposals 4 button aria-hidden
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">全て採用<\/span>/.test(dpp) &&
    /<span aria-hidden="true">全て却下<\/span>/.test(dpp) &&
    /<span aria-hidden="true">やり直し<\/span>/.test(dpp) &&
    /<span aria-hidden="true">✓ 採用<\/span>/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `iter842 invariant: decompose-proposals 4 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter842 invariant: 破壊` })
  }

  // iter841 invariant: items-board view-switcher aria-hidden
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">Today<\/span>/.test(ib) &&
    /<span aria-hidden="true">月次<\/span>/.test(ib)
  ) {
    findings.push({
      level: 'info',
      message: `iter841 invariant: items-board view-switcher 9 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter841 invariant: 破壊` })
  }

  console.log(`\n=== Findings (async-states-error-retry-aria-hidden-iter844) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
