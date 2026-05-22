/**
 * Phase 6.15 loop iter1104: comment-thread 4 button (cancel/save/edit/delete) aria-label
 * visible-prefix regression guard。
 *
 * iter1104 で発見した bug: 4 button × 多 path の旧 aria-label は visible "キャンセル" / "保存"
 * / "保存中…" / "編集" / "削除" / "削除中…" を末尾持ちで voice control prefix-matching「click
 * 保存/キャンセル/削除/編集」 match 不可。iter1093-1103 sweep convention に合わせ visible 冒頭固定。
 *
 * 修正 (comment-thread.tsx):
 *   - comment-edit-cancel: "キャンセル — コメントの編集を破棄"
 *   - comment-save default: "保存 — コメントの編集を保存 (Cmd/Ctrl+Enter でも可)"
 *   - comment-save pending: "保存中… — コメントの編集を保存中"
 *   - comment-edit: "編集 — コメント「body」を編集"
 *   - comment-delete default: "削除 — コメント「body」を削除"
 *   - comment-delete pending: "削除中… — コメント「body」を削除中"
 *
 * empty-body save path は visible "保存" が "保存するには本文を入力してください" の prefix で維持。
 *
 * 実 supabase + auth + workspace + comment fixture 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-comment-thread-visible-prefix-iter1104.ts
 * 前提: なし
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))
  const filePath = resolve(here, '../src/components/workspace/comment-thread.tsx')
  const src = readFileSync(filePath, 'utf8')

  // visible-prefix 形式の存在
  const expected = [
    '"キャンセル — コメントの編集を破棄"',
    "'保存 — コメントの編集を保存 (Cmd/Ctrl+Enter でも可)'",
    "'保存中… — コメントの編集を保存中'",
    '`編集 — コメント「${comment.body.slice(0, 30)}',
    '`削除 — コメント「${comment.body.slice(0, 30)}',
    '`削除中… — コメント「${comment.body.slice(0, 30)}',
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `comment-thread に visible-prefix '${e}' が無い`,
      })
    }
  }
  // 旧 bare aria-label が残ってないか
  const oldBares = [
    '"コメントの編集をキャンセル"',
    "'コメントの編集を保存中…'",
    "'コメントの編集を保存 (Cmd/Ctrl+Enter でも可)'",
  ]
  for (const s of oldBares) {
    if (src.includes(s)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 bare aria-label '${s}' が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — comment-thread 4 button aria-label は visible-prefix 配置済')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
