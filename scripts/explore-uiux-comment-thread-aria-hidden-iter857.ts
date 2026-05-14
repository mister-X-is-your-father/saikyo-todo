/**
 * Phase 6.15 loop iter857 — comment-thread.tsx の 5 button visible text を aria-hidden
 * span で wrap した regression guard。
 *
 * 対象 button (Item edit dialog コメント tab 内):
 *   1. 投稿 button "{create.isPending ? '送信中…' : '投稿'}" — comment post
 *   2. キャンセル button "キャンセル" — edit cancel
 *   3. 保存 button "保存" — edit save
 *   4. 編集 button "編集" — edit start (icon-less)
 *   5. 削除 button "削除" — soft delete
 *
 * 全 button 既に aria-label に対象コメント先頭 30 字を含む完全 content を持つ。
 * iter844-856 sweep の続編、auth gate 後 page (item-edit-dialog) の同 pattern 一括 wrap。
 *
 *   pnpm tsx scripts/explore-uiux-comment-thread-aria-hidden-iter857.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/workspace/comment-thread.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  // 1. 投稿 button: <span aria-hidden="true">{create.isPending ? '送信中…' : '投稿'}</span>
  if (!/<span aria-hidden="true">\{create\.isPending \? '送信中…' : '投稿'\}<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '投稿 button の visible text wrap が見つからない' })
  }

  // 2. キャンセル button: aria-label="コメントの編集をキャンセル" の直後に
  //    <span aria-hidden="true">キャンセル</span>
  if (
    !/aria-label="コメントの編集をキャンセル"[\s\S]{0,80}<span aria-hidden="true">キャンセル<\/span>/.test(
      src,
    )
  ) {
    findings.push({
      level: 'error',
      message: 'キャンセル button の visible text wrap が見つからない',
    })
  }

  // 3. 保存 button: <span aria-hidden="true">保存</span>
  if (!/<span aria-hidden="true">保存<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '保存 button の visible text wrap が見つからない' })
  }

  // 4. 編集 button: <span aria-hidden="true">編集</span>
  if (!/<span aria-hidden="true">編集<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '編集 button の visible text wrap が見つからない' })
  }

  // 5. 削除 button: <span aria-hidden="true">削除</span>
  if (!/<span aria-hidden="true">削除<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '削除 button の visible text wrap が見つからない' })
  }

  // 6. aria-label invariant (代表 5 種):
  const arias = [
    'コメントを投稿するには本文を入力してください',
    'コメントを投稿中…',
    'コメントを投稿 (Cmd/Ctrl+Enter でも可、@user で言及・通知)',
    'コメントの編集をキャンセル',
    'コメントを保存するには本文を入力してください',
    'コメントの編集を保存中…',
    'コメントの編集を保存 (Cmd/Ctrl+Enter でも可)',
  ]
  for (const a of arias) {
    if (!src.includes(`'${a}'`) && !src.includes(`"${a}"`)) {
      findings.push({ level: 'error', message: `aria-label "${a}" が見つからない` })
    }
  }

  // 7. iter356 invariant: aria-keyshortcuts="Meta+Enter Control+Enter" 3 ヶ所 (input + post + save)
  const ksCount = (src.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []).length
  if (ksCount < 3) {
    findings.push({
      level: 'error',
      message: `aria-keyshortcuts="Meta+Enter Control+Enter" が ${ksCount} 件 < 3 件 (iter356 invariant)`,
    })
  }

  // 8. raw visible "投稿" / "保存" / "編集" / "削除" / "キャンセル" が <Button> または <button> の
  //    閉じタグ直前に 単独行で残っていないか
  const rawRows = src
    .split('\n')
    .filter((line) => /^\s*(投稿|保存|編集|削除|キャンセル|送信中…)\s*$/.test(line))
  if (rawRows.length > 0) {
    findings.push({
      level: 'error',
      message: `raw visible text 単独行が ${rawRows.length} 件残存: ${rawRows.map((r) => r.trim()).join(', ')}`,
    })
  }

  console.log(`\n=== Findings (comment-thread-aria-hidden iter857) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
