/**
 * Phase 6.15 loop iter 872 (mode-D Desktop a11y) —
 * signup-form submit button: WCAG 2.5.3 (Label in Name) prefix 適合 (visible prefix 統一)。
 *
 * 課題: src/components/auth/signup-form.tsx の signup-submit:
 *   - visible: "サインアップ" / "作成中…" (iter845 で aria-hidden 維持済み)
 *   - 旧 aria-label: "アカウントを作成 (サインアップ)" / "アカウント作成中… (サインアップ
 *     処理を実行中)"
 *   - 問題: 通常時 visible "サインアップ" が aria-label 末尾 (parens 内)、prefix では無く
 *     voice user 発話「サインアップ」と name 先頭不一致 → WCAG 2.5.3 推奨形に未到達。
 *     pending 時 visible "作成中…" は aria-label の起点が「アカウント作成中…」 で
 *     "作成中" が含まれるが「アカウント」 prefix が voice user 発話と不整合。
 *   一方 login-form login-submit は既に visible "ログイン" / "ログイン中…" が aria-label
 *   先頭で適合済。signup-form のみ並走未対応で残っていた。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を visible text prefix 形に変更:
 *     - 通常: 「サインアップ (アカウントを新規作成)」
 *     - pending: 「作成中… (アカウント作成中、サインアップ処理を実行中)」
 *   - visible は既に aria-hidden 維持 (iter845)、aria-label の prefix 化のみで適合化
 *     (iter844-871 と一貫、login-form と並走整合)。
 *
 * 検証: source-side regex assert + iter844/845/862/869/871 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sf = readFileSync(resolve(process.cwd(), 'src/components/auth/signup-form.tsx'), 'utf8')

  // 1. signup-submit aria-label prefix
  if (
    /aria-label=\{[\s\S]+?'作成中… \(アカウント作成中、サインアップ処理を実行中\)'/.test(sf) &&
    /aria-label=\{[\s\S]+?'サインアップ \(アカウントを新規作成\)'/.test(sf)
  ) {
    findings.push({
      level: 'info',
      message: `signup-submit aria-label visible "サインアップ" / "作成中…" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `signup-submit aria-label NG` })
  }

  // 2. iter845 invariant: visible aria-hidden 維持
  if (/<span aria-hidden="true">\{isPending \? '作成中…' : 'サインアップ'\}<\/span>/.test(sf)) {
    findings.push({
      level: 'info',
      message: `iter845 invariant: signup-submit visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter845 invariant: 破壊` })
  }

  // 3. login-form login-submit (iter844 invariant + 同 pattern 並走整合)
  const lf = readFileSync(resolve(process.cwd(), 'src/components/auth/login-form.tsx'), 'utf8')
  if (
    /aria-label=\{[\s\S]+?'ログイン中… \(認証処理を実行中\)' : 'ログイン \(メール \+ パスワードで認証\)'/.test(
      lf,
    ) &&
    /<span aria-hidden="true">\{isPending \? 'ログイン中…' : 'ログイン'\}<\/span>/.test(lf)
  ) {
    findings.push({
      level: 'info',
      message: `iter844 invariant: login-submit aria-label prefix + aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter844 invariant: 破壊` })
  }

  // data-testid 維持
  if (/data-testid="signup-submit"/.test(sf)) {
    findings.push({
      level: 'info',
      message: `signup-submit data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `signup-submit data-testid 破壊` })
  }

  // iter871 invariant: sprint-period-save
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{[\s\S]+?`保存 \(Sprint「\$\{sprint\.name\}」の期間を保存\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter871 invariant: sprint-period-save aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter871 invariant: 破壊` })
  }

  // iter869 invariant: comment-edit-cancel
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (/aria-label="キャンセル \(コメントの編集をキャンセル\)"/.test(ct)) {
    findings.push({
      level: 'info',
      message: `iter869 invariant: comment-edit-cancel aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter869 invariant: 破壊` })
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

  console.log(`\n=== Findings (signup-submit-label-in-name-iter872) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
