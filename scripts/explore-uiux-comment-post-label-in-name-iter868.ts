/**
 * Phase 6.15 loop iter 868 (mode-D Desktop a11y) —
 * comment-thread の comment-post button: WCAG 2.5.3 (Label in Name) 適合 + pending 用語整合。
 *
 * 課題: src/components/workspace/comment-thread.tsx の comment-post:
 *   - visible: "投稿" / "送信中…" (NOT aria-hidden 統合)
 *   - 旧 aria-label: "コメントを投稿…" / "コメントを投稿中…" / disabled "コメントを投稿
 *     するには本文を入力してください"
 *   - 問題:
 *     1. visible "投稿" が aria-label suffix substring (prefix 不一致)
 *     2. visible "送信中…" / aria-label "投稿中…" で **用語不一致** = SR/sighted 状態名
 *        完全別物 (label-in-name 直接違反)
 *   iter844-867 で同 pattern を順次適合化済、本 form button が残る。
 *
 * fix (1 ファイル ~4 行差分):
 *   - aria-label を visible text prefix 形に変更:
 *     - 通常: 「投稿 (コメントを投稿、Cmd/Ctrl+Enter でも可、@user で言及・通知)」
 *     - pending: 「送信中… (コメントを投稿中)」 ← "送信中…" / "投稿中" を併記で SR /
 *       sighted の用語乖離を解消
 *     - disabled: 「投稿 (現状は無効: 本文を入力してください)」 ← 動作名 prefix で予測性向上
 *   - visible "投稿" / "送信中…" を <span aria-hidden="true"> で wrap、aria-label 単独
 *     経路に統一 (iter844-867 と一貫)。
 *
 * 検証: source-side regex assert + iter860/862/865/866/867 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )

  // 1. aria-label visible "投稿" prefix (通常 + disabled)
  if (
    /aria-label=\{[\s\S]+?'投稿 \(コメントを投稿、Cmd\/Ctrl\+Enter でも可、@user で言及・通知\)'/.test(
      ct,
    ) &&
    /aria-label=\{[\s\S]+?'投稿 \(現状は無効: 本文を入力してください\)'/.test(ct)
  ) {
    findings.push({
      level: 'info',
      message: `comment-post aria-label visible "投稿" prefix (通常 + disabled) OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `comment-post aria-label 通常/disabled NG` })
  }

  // 2. pending aria-label visible "送信中…" prefix + 用語整合
  if (/aria-label=\{[\s\S]+?'送信中… \(コメントを投稿中\)'/.test(ct)) {
    findings.push({
      level: 'info',
      message: `comment-post pending aria-label visible "送信中…" prefix + 用語整合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `comment-post pending aria-label NG` })
  }

  // 3. visible "投稿" / "送信中…" span aria-hidden
  if (/<span aria-hidden="true">\{create\.isPending \? '送信中…' : '投稿'\}<\/span>/.test(ct)) {
    findings.push({
      level: 'info',
      message: `comment-post visible "投稿" / "送信中…" span aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `comment-post aria-hidden NG` })
  }

  // 4. data-testid 維持
  if (/data-testid="comment-post"/.test(ct)) {
    findings.push({
      level: 'info',
      message: `comment-post data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `comment-post data-testid 破壊` })
  }

  // iter867 invariant: create-time-entry-submit
  const cte = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{create\.isPending \? '記録 中… \(稼働記録を作成中\)' : '記録 \(稼働記録を作成\)'\}/.test(
      cte,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter867 invariant: create-time-entry-submit aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter867 invariant: 破壊` })
  }

  // iter866 invariant: backlog-edit
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/aria-label=\{`編集 \(「\$\{row\.original\.title\}」を編集\)`\}/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter866 invariant: backlog-edit aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter866 invariant: 破壊` })
  }

  // iter862 invariant: item-edit-save
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{[\s\S]+?`保存 \(「\$\{item\.title\}」を保存、Cmd\/Ctrl\+S でも可、楽観ロックで version が進む\)`/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter862 invariant: item-edit-save aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter862 invariant: 破壊` })
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

  console.log(`\n=== Findings (comment-post-label-in-name-iter868) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
