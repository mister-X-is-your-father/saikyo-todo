/**
 * Phase 6.15 loop iter 584 (mode-D Desktop a11y) —
 * comment-thread CommentItem 編集 save Button に aria-keyshortcuts (Meta+Enter Control+Enter)。
 *
 * 課題: comment-thread.tsx 行 207-217 の編集 Textarea で Cmd/Ctrl+Enter 押下を購読し
 *   handleSave を呼ぶが、保存 Button (行 238-255) は aria-keyshortcuts 不在で SR /
 *   voice control に shortcut が expose されない。post 側の comment-post Button は
 *   iter356 で aria-keyshortcuts="Meta+Enter Control+Enter" 済、編集側は未対応だった。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-keyshortcuts="Meta+Enter Control+Enter"
 *   - aria-label active 状態に "Cmd/Ctrl+Enter でも可" 追記
 *
 * iter580 (decompose-proposals 編集 save) と同 pattern を comment-thread 編集 save に
 * 水平展開。Cmd/Ctrl+Enter shortcut を持つ全 form / 編集 save Button が aria-keyshortcuts
 * 統一達成 (goals-panel / sprints-panel / subtasks-panel / personal-period-view /
 * team-context-editor / decompose-proposals-panel / workflows-panel / templates-panel /
 * comment-post / comment-edit-save = 10 Button)。
 *
 * 検証: source-side regex assert + iter515-583 invariant cross-check。
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

  // 1. comment-save (編集) aria-keyshortcuts
  if (
    /data-testid=\{`comment-save-\$\{comment\.id\}`\}\s*\n\s*aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(
      ct,
    )
  ) {
    findings.push({
      level: 'info',
      message: `comment-thread.tsx: comment-save (編集) aria-keyshortcuts 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-thread.tsx: comment-save (編集) aria-keyshortcuts 不在`,
    })
  }

  // 2. aria-label active 状態に Cmd/Ctrl+Enter 記載
  if (/'コメントの編集を保存 \(Cmd\/Ctrl\+Enter でも可\)'/.test(ct)) {
    findings.push({
      level: 'info',
      message: `comment-thread.tsx: 編集 save aria-label に shortcut 記載 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-thread.tsx: 編集 save aria-label に shortcut 記載なし`,
    })
  }

  // 3. iter356 invariant: comment-post (投稿) aria-keyshortcuts 維持
  if (/data-testid="comment-post"[\s\S]*?aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(ct)) {
    findings.push({
      level: 'info',
      message: `iter356 invariant: comment-post aria-keyshortcuts 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter356 invariant: 破壊`,
    })
  }

  // 4. iter583 invariant: subtasks-panel indent/outdent aria-keyshortcuts
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (
    /data-testid=\{`subtask-outdent-\$\{item\.id\}`\}\s*\n\s*aria-keyshortcuts="Alt\+ArrowLeft"/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter583 invariant: subtasks-panel outdent aria-keyshortcuts 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter583 invariant: 破壊`,
    })
  }

  // 5. iter515 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (comment-save-keyshortcuts-iter584) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
