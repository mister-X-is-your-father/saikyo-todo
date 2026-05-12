/**
 * Phase 6.15 loop iter 870 (mode-D Desktop a11y) —
 * decompose-proposals-panel ProposalRow 編集 form 2 button (cancel / save):
 * WCAG 2.5.3 (Label in Name) prefix 適合 + visible aria-hidden 統一。
 *
 * 課題: src/components/workspace/decompose-proposals-panel.tsx の編集 form:
 *   - proposal-{id}-edit-cancel: visible "キャンセル" NOT aria-hidden +
 *     aria-label「「N」の編集をキャンセル」 suffix substring (prefix 不一致)
 *   - proposal-{id}-save: visible "保存" / "保存中…" NOT aria-hidden + aria-label
 *     「提案「N」の編集を保存…」 suffix substring (prefix 不一致)
 *   iter844-869 で同 pattern を順次適合化済、ProposalRow 編集 form の 2 button が残る。
 *
 * fix (1 ファイル、2 button 一括 ~4 行差分):
 *   - 各 aria-label を visible text prefix 形に変更:
 *     - キャンセル → 「キャンセル (「N」の編集をキャンセル)」
 *     - 保存 / 保存中… → 「保存 (提案「N」の編集を保存、Cmd/Ctrl+Enter でも可)」 /
 *       「保存中… (提案「N」の編集を保存中)」
 *   - 2 button の visible を <span aria-hidden="true"> で wrap、aria-label 単独経路に
 *     統一 (iter844-869 と一貫)。aria-keyshortcuts は維持。
 *
 * 検証: source-side regex assert + iter860/865/866/868/869 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // 1. proposal-edit-cancel aria-label prefix + aria-hidden
  if (
    /aria-label=\{`キャンセル \(「\$\{proposal\.title\}」の編集をキャンセル\)`\}/.test(dp) &&
    /data-testid=\{`proposal-\$\{proposal\.id\}-edit-cancel`\}[\s\S]+?<span aria-hidden="true">キャンセル<\/span>/.test(
      dp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `proposal-edit-cancel aria-label visible "キャンセル" prefix + aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `proposal-edit-cancel NG` })
  }

  // 2. proposal-save aria-label prefix (通常 + pending) + aria-hidden
  if (
    /aria-label=\{[\s\S]+?`保存 \(提案「\$\{proposal\.title\}」の編集を保存、Cmd\/Ctrl\+Enter でも可\)`/.test(
      dp,
    ) &&
    /aria-label=\{[\s\S]+?`保存中… \(提案「\$\{proposal\.title\}」の編集を保存中\)`/.test(dp) &&
    /<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(dp)
  ) {
    findings.push({
      level: 'info',
      message: `proposal-save aria-label visible "保存" prefix (通常 + pending) + aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `proposal-save NG` })
  }

  // 3. data-testid 維持
  if (
    /data-testid=\{`proposal-\$\{proposal\.id\}-edit-cancel`\}/.test(dp) &&
    /data-testid=\{`proposal-\$\{proposal\.id\}-save`\}/.test(dp)
  ) {
    findings.push({
      level: 'info',
      message: `proposal edit form 2 button data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `proposal edit form 2 button data-testid 破壊` })
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

  // iter860 invariant: proposal accept
  if (
    /aria-label=\{[\s\S]+?`採用 \(「\$\{proposal\.title\}」を採用して子タスクとして追加\)`/.test(dp)
  ) {
    findings.push({
      level: 'info',
      message: `iter860 invariant: proposal accept aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter860 invariant: 破壊` })
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

  console.log(`\n=== Findings (proposal-edit-form-label-in-name-iter870) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
