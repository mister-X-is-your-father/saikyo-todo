/**
 * Phase 6.15 loop iter 874 (mode-D Desktop a11y) —
 * quick-add submit button: WCAG 2.5.3 (Label in Name) prefix 適合 (4 状態統一)。
 *
 * 課題: src/components/workspace/quick-add.tsx の quick-add-submit:
 *   - visible: "作成" / "..." (iter848 で aria-hidden 維持済み)
 *   - 旧 aria-label: 4 状態
 *     - 通常「「N」を作成 (Enter でも可)」
 *     - pending「「N」を作成中…」
 *     - no-title「タスクを作成するにはタイトルを入力してください…」
 *     - MUST「MUST タスクは編集ダイアログから DoD を入力して作成してください」
 *   - 問題: 4 状態すべて visible "作成" が suffix substring (prefix 不一致) → voice
 *     user 発話「作成」と name 先頭不一致 → WCAG 2.5.3 推奨形に未到達。pending visible
 *     "..." は aria-label に substring としても **含まれない** = visible / accessible
 *     name 完全別物 (label-in-name 直接違反)。
 *   iter844-873 で同 pattern 順次適合化済、workspace 最頻 entry point の本 button が
 *   残っていた → 解消。
 *
 * fix (1 ファイル ~5 行差分):
 *   - aria-label を visible "作成" prefix 形に変更 (4 状態すべて):
 *     - 通常: 「作成 (「N」を作成、Enter でも可)」
 *     - pending: 「作成 中... (「N」を作成中)」 ← "..." → "中..." で SR ユーザに状態明示
 *     - no-title: 「作成 (現状は無効: タイトルを入力してください、Enter でも可)」
 *     - MUST: 「作成 (現状は無効: MUST タスクは編集ダイアログから DoD を入力して作成して
 *       ください)」
 *   - visible は iter848 で aria-hidden 維持、aria-label の prefix 化のみで適合化
 *     (iter844-873 と一貫)。
 *
 * 検証: source-side regex assert + iter848/871/872/873 invariant cross-check。
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

  // 1. aria-label 通常 prefix
  if (/aria-label=\{[\s\S]+?`作成 \(「\$\{preview\.title\}」を作成、Enter でも可\)`/.test(qa)) {
    findings.push({
      level: 'info',
      message: `quick-add-submit aria-label 通常 visible "作成" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `quick-add-submit 通常 aria-label NG` })
  }

  // 2. aria-label pending prefix
  if (/aria-label=\{[\s\S]+?`作成 中\.\.\. \(「\$\{preview\.title\}」を作成中\)`/.test(qa)) {
    findings.push({
      level: 'info',
      message: `quick-add-submit aria-label pending "作成 中..." prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `quick-add-submit pending aria-label NG` })
  }

  // 3. aria-label no-title prefix
  if (
    /aria-label=\{[\s\S]+?'作成 \(現状は無効: タイトルを入力してください、Enter でも可\)'/.test(qa)
  ) {
    findings.push({
      level: 'info',
      message: `quick-add-submit aria-label no-title "作成" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `quick-add-submit no-title aria-label NG` })
  }

  // 4. aria-label MUST prefix
  if (
    /aria-label=\{[\s\S]+?'作成 \(現状は無効: MUST タスクは編集ダイアログから DoD を入力して作成してください\)'/.test(
      qa,
    )
  ) {
    findings.push({
      level: 'info',
      message: `quick-add-submit aria-label MUST "作成" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `quick-add-submit MUST aria-label NG` })
  }

  // 5. iter848 invariant: visible aria-hidden 維持
  if (/<span aria-hidden="true">\{create\.isPending \? '\.\.\.' : '作成'\}<\/span>/.test(qa)) {
    findings.push({
      level: 'info',
      message: `iter848 invariant: quick-add-submit visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter848 invariant: 破壊` })
  }

  // 6. data-testid 維持
  if (/data-testid="quick-add-submit"/.test(qa)) {
    findings.push({
      level: 'info',
      message: `quick-add-submit data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `quick-add-submit data-testid 破壊` })
  }

  // iter873 invariant: create-workspace-submit
  const cwf = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if (/aria-label=\{[\s\S]+?'作成 \(Workspace を新規作成\)'/.test(cwf)) {
    findings.push({
      level: 'info',
      message: `iter873 invariant: create-workspace-submit aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter873 invariant: 破壊` })
  }

  // iter872 invariant: signup-submit
  const sf = readFileSync(resolve(process.cwd(), 'src/components/auth/signup-form.tsx'), 'utf8')
  if (/aria-label=\{[\s\S]+?'サインアップ \(アカウントを新規作成\)'/.test(sf)) {
    findings.push({
      level: 'info',
      message: `iter872 invariant: signup-submit aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter872 invariant: 破壊` })
  }

  // iter850 invariant: bulk-delete
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">削除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete "削除" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: 破壊` })
  }

  console.log(`\n=== Findings (quick-add-submit-label-in-name-iter874) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
