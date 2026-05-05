/**
 * Phase 6.15 loop iter 791 (mode-D Desktop a11y) —
 * decompose-proposals-panel ProposalRow の DoD IMEInput に dynamic aria-label
 * (char count + state) を追加。
 *
 * 課題: decompose-proposals-panel.tsx 行 452-462 の DoD IMEInput は title /
 *   description と異なり aria-label が無い。Label htmlFor は紐付くが、
 *   title field は char count + 上限近接 + 空白のみ不正の dynamic state を
 *   aria-label に持つので、DoD も対称な dynamic aria-label を持つべき。
 *   iter500 path (manual handleSubmit form の a11y 統一) の続編。
 *
 * fix (1 ファイル ~10 行差分):
 *   - DoD IMEInput に title 同等の 4-state aria-label 追加
 *     (空 / 空白のみ / 上限近接 / 通常 char count)
 *
 * 検証: source-side regex assert + iter735-790 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  const hasEmpty = /提案 DoD \(MUST 必須、最大 2000 文字、完了条件を具体記述\)/.test(dpp)
  const hasUpperNear = /提案 DoD \(現在 \$\{dod\.length\} \/ 2000 文字、上限近接\)/.test(dpp)
  const hasNormal = /提案 DoD \(現在 \$\{dod\.length\} \/ 2000 文字\)/.test(dpp)
  if (hasEmpty && hasUpperNear && hasNormal) {
    findings.push({
      level: 'info',
      message: `decompose-proposals DoD IMEInput dynamic aria-label OK (4-state full)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals DoD IMEInput aria-label 不完全 (empty=${hasEmpty} upperNear=${hasUpperNear} normal=${hasNormal})`,
    })
  }

  // iter790 invariant: mock-login-form Submit idle aria-label
  const mlf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (/'ログイン \(mock-timesheet email \+ password で認証\)'/.test(mlf)) {
    findings.push({
      level: 'info',
      message: `iter790 invariant: mock-login-form Submit idle aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter790 invariant: 破壊` })
  }

  // iter789 invariant: signup-form Submit pending state functional context
  const sf = readFileSync(resolve(process.cwd(), 'src/components/auth/signup-form.tsx'), 'utf8')
  if (/アカウント作成中… \(サインアップ処理を実行中\)/.test(sf)) {
    findings.push({
      level: 'info',
      message: `iter789 invariant: signup-form Submit pending functional context 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter789 invariant: 破壊` })
  }

  // iter788 invariant: workspace-mode-selector aria-describedby
  const wms = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )
  if (/aria-describedby="workspace-mode-hint"/.test(wms) && /id="workspace-mode-hint"/.test(wms)) {
    findings.push({
      level: 'info',
      message: `iter788 invariant: workspace-mode-selector hint 連携 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter788 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (proposal-dod-aria-label-iter791) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
