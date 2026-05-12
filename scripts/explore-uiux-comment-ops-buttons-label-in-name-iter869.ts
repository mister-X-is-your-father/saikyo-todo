/**
 * Phase 6.15 loop iter 869 (mode-D Desktop a11y) —
 * comment-thread の comment 操作 button 4 件 (edit / save / cancel / delete):
 * WCAG 2.5.3 (Label in Name) 一括 prefix 適合 + visible aria-hidden 統一。
 *
 * 課題: src/components/workspace/comment-thread.tsx の各 button:
 *   - comment-edit-cancel-{id}: visible "キャンセル" NOT aria-hidden + aria-label
 *     "コメントの編集をキャンセル" suffix substring (prefix 不一致)
 *   - comment-save-{id}: visible "保存" NOT aria-hidden + aria-label「コメントの編集を
 *     保存…」 suffix substring (prefix 不一致)
 *   - comment-edit-{id}: visible "編集" NOT aria-hidden + aria-label「コメント「N」を編集」
 *     suffix substring (prefix 不一致)
 *   - comment-delete-{id}: visible "削除" NOT aria-hidden + aria-label「コメント「N」を
 *     削除」 suffix substring (prefix 不一致)
 *   iter844-868 で同 pattern を順次適合化済、本 file 内 4 button が残る。
 *
 * fix (1 ファイル、4 button 一括 ~8 行差分):
 *   - 各 aria-label を visible text prefix 形に変更:
 *     - キャンセル → 「キャンセル (コメントの編集をキャンセル)」
 *     - 保存 → 「保存 (コメントの編集を保存、Cmd/Ctrl+Enter…)」 / pending「保存 中… (…)」
 *       / disabled「保存 (現状は無効: 本文を入力してください)」
 *     - 編集 → 「編集 (コメント「N」を編集)」
 *     - 削除 → 「削除 (コメント「N」を削除)」 / pending「削除 中… (…)」
 *   - 4 button の visible を <span aria-hidden="true"> で wrap、aria-label 単独経路に
 *     統一 (iter844-868 と一貫)。
 *
 * 検証: source-side regex assert + iter862/865/866/867/868 invariant cross-check。
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

  // 1. comment-edit-cancel: visible "キャンセル" prefix + aria-hidden
  if (
    /aria-label="キャンセル \(コメントの編集をキャンセル\)"/.test(ct) &&
    /<span aria-hidden="true">キャンセル<\/span>/.test(ct)
  ) {
    findings.push({
      level: 'info',
      message: `comment-edit-cancel aria-label visible "キャンセル" prefix + aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `comment-edit-cancel NG` })
  }

  // 2. comment-save: visible "保存" prefix (通常 + pending + disabled) + aria-hidden
  if (
    /aria-label=\{[\s\S]+?'保存 \(コメントの編集を保存、Cmd\/Ctrl\+Enter でも可\)'/.test(ct) &&
    /aria-label=\{[\s\S]+?'保存 中… \(コメントの編集を保存中\)'/.test(ct) &&
    /aria-label=\{[\s\S]+?'保存 \(現状は無効: 本文を入力してください\)'/.test(ct) &&
    /<span aria-hidden="true">保存<\/span>/.test(ct)
  ) {
    findings.push({
      level: 'info',
      message: `comment-save aria-label visible "保存" prefix (3 状態) + aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `comment-save NG` })
  }

  // 3. comment-edit: visible "編集" prefix + aria-hidden
  if (
    /aria-label=\{`編集 \(コメント「\$\{comment\.body\.slice\(0, 30\)\}\$\{comment\.body\.length > 30 \? '…' : ''\}」を編集\)`\}/.test(
      ct,
    ) &&
    /<span aria-hidden="true">編集<\/span>/.test(ct)
  ) {
    findings.push({
      level: 'info',
      message: `comment-edit aria-label visible "編集" prefix + aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `comment-edit NG` })
  }

  // 4. comment-delete: visible "削除" prefix + aria-hidden (通常 + pending)
  if (
    /aria-label=\{[\s\S]+?`削除 \(コメント「\$\{comment\.body\.slice\(0, 30\)\}\$\{comment\.body\.length > 30 \? '…' : ''\}」を削除\)`/.test(
      ct,
    ) &&
    /aria-label=\{[\s\S]+?`削除 中… \(コメント「\$\{comment\.body\.slice\(0, 30\)\}\$\{comment\.body\.length > 30 \? '…' : ''\}」を削除中\)`/.test(
      ct,
    ) &&
    /<span aria-hidden="true">削除<\/span>/.test(ct)
  ) {
    findings.push({
      level: 'info',
      message: `comment-delete aria-label visible "削除" prefix (2 状態) + aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `comment-delete NG` })
  }

  // 5. data-testid 維持
  if (
    /data-testid=\{`comment-edit-cancel-\$\{comment\.id\}`\}/.test(ct) &&
    /data-testid=\{`comment-save-\$\{comment\.id\}`\}/.test(ct) &&
    /data-testid=\{`comment-edit-\$\{comment\.id\}`\}/.test(ct) &&
    /data-testid=\{`comment-delete-\$\{comment\.id\}`\}/.test(ct)
  ) {
    findings.push({
      level: 'info',
      message: `4 button data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `4 button data-testid 破壊` })
  }

  // iter868 invariant: comment-post
  if (
    /aria-label=\{[\s\S]+?'投稿 \(コメントを投稿、Cmd\/Ctrl\+Enter でも可、@user で言及・通知\)'/.test(
      ct,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter868 invariant: comment-post aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter868 invariant: 破壊` })
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

  console.log(`\n=== Findings (comment-ops-buttons-label-in-name-iter869) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
