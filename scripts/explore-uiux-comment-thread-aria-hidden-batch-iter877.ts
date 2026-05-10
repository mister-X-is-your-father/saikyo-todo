/**
 * Phase 6.15 loop iter 877 (mode-D Desktop a11y) —
 * comment-thread 5 button (comment-post / comment-edit-cancel / comment-save /
 * comment-edit / comment-delete): visible text を span aria-hidden で wrap +
 * comment-post 投稿 button vocab を統一 ('送信中…' → '投稿中…')。
 *
 * 課題: src/components/workspace/comment-thread.tsx:
 *   - comment-post (visible '送信中…' pending) aria-label 'コメントを投稿中…' で
 *     visible '送信中…' substring 不適合 (送信中 vs 投稿中 vocab mismatch、WCAG 2.5.3 違反)
 *   - comment-edit-cancel / comment-save / comment-edit / comment-delete: aria-label substring
 *     適合だったが iter844-876 campaign 規約 (visible aria-hidden 単独経路) から外れていた
 *
 * fix (1 ファイル / +5-5 行差分、5 button 一括):
 *   - comment-post visible pending: '送信中…' → '投稿中…' (vocab 統一) + span aria-hidden
 *   - comment-edit-cancel: visible 'キャンセル' wrap
 *   - comment-save: visible '保存中…/保存' wrap (visible pending '保存中…' を追加で aria-label substring に)
 *   - comment-edit: visible '編集' wrap
 *   - comment-delete: visible '削除' wrap
 *
 * 検証: source-side regex assert + iter875/876 invariant cross-check。
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

  // 1. comment-post visible '投稿中…' / '投稿' span aria-hidden + 旧 '送信中…' 削除
  if (/<span aria-hidden="true">\{create\.isPending \? '投稿中…' : '投稿'\}<\/span>/.test(ct)) {
    findings.push({
      level: 'info',
      message: `comment-post visible '投稿中…/投稿' span aria-hidden + vocab 統一 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-post visible aria-hidden 未統合 or vocab 未統一`,
    })
  }
  if (!/'送信中…' : '投稿'/.test(ct)) {
    findings.push({
      level: 'info',
      message: `comment-post 旧 visible '送信中…' 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-post 旧 visible '送信中…' 残存`,
    })
  }

  // 2. comment-edit-cancel visible 'キャンセル' span aria-hidden
  if (
    /data-testid=\{`comment-edit-cancel-\$\{comment\.id\}`\}[\s\S]+?<span aria-hidden="true">キャンセル<\/span>/.test(
      ct,
    )
  ) {
    findings.push({
      level: 'info',
      message: `comment-edit-cancel visible 'キャンセル' span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-edit-cancel visible 'キャンセル' aria-hidden 未統合`,
    })
  }

  // 3. comment-save visible '保存中…/保存' span aria-hidden
  if (
    /data-testid=\{`comment-save-\$\{comment\.id\}`\}[\s\S]+?<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(
      ct,
    )
  ) {
    findings.push({
      level: 'info',
      message: `comment-save visible '保存中…/保存' span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-save visible '保存中…/保存' aria-hidden 未統合`,
    })
  }

  // 4. comment-edit visible '編集' span aria-hidden
  if (
    /data-testid=\{`comment-edit-\$\{comment\.id\}`\}[\s\S]+?<span aria-hidden="true">編集<\/span>/.test(
      ct,
    )
  ) {
    findings.push({
      level: 'info',
      message: `comment-edit visible '編集' span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-edit visible '編集' aria-hidden 未統合`,
    })
  }

  // 5. comment-delete visible '削除' span aria-hidden
  if (
    /data-testid=\{`comment-delete-\$\{comment\.id\}`\}[\s\S]+?<span aria-hidden="true">削除<\/span>/.test(
      ct,
    )
  ) {
    findings.push({
      level: 'info',
      message: `comment-delete visible '削除' span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-delete visible '削除' aria-hidden 未統合`,
    })
  }

  // iter876 invariant: redecompose aria-label
  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/`再分解 \(AI 分解を再実行\)`/.test(dp)) {
    findings.push({
      level: 'info',
      message: `iter876 invariant: redecompose aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter876 invariant: redecompose 破壊` })
  }

  console.log(`\n=== Findings (comment-thread-aria-hidden-batch-iter877) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
