/**
 * Phase 6.15 loop iter 547 (mode-D Desktop a11y) —
 * CommentThread comment edit cancel Button に aria-label + data-testid を補完。
 *
 * 課題: comment-thread.tsx 行 225-233 の cancel Button は visible text
 *   "キャンセル" のみで aria-label / data-testid 不在。SR は「キャンセル ボタン」
 *   だけで context が伝わらない。コメントが複数並列時に SR は識別困難。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-label="コメントの編集をキャンセル"
 *   - data-testid={`comment-edit-cancel-${comment.id}`}
 *
 * iter543 (wf) / iter544 (item-edit) / iter545 (schedule-picker) /
 * iter546 (proposal-edit) と同 pattern を CommentThread edit footer に展開、
 * 5 dialog footer 統一達成。
 *
 * 検証: source-side regex assert + iter515-546 invariant cross-check。
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

  // 1. comment-edit-cancel aria-label + data-testid
  if (
    /data-testid=\{`comment-edit-cancel-\$\{comment\.id\}`\}\s+aria-label="コメントの編集をキャンセル"/.test(
      ct,
    ) ||
    /aria-label="コメントの編集をキャンセル"\s+data-testid=\{`comment-edit-cancel-\$\{comment\.id\}`\}/.test(
      ct,
    )
  ) {
    findings.push({
      level: 'info',
      message: `comment-thread.tsx: comment-edit-cancel aria-label + data-testid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-thread.tsx: cancel Button aria-label / data-testid 不在`,
    })
  }

  // 2. iter546 invariant: proposal-edit-cancel aria-label 維持
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`「\$\{proposal\.title\}」の編集をキャンセル`\}/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `iter546 invariant: proposal-edit-cancel aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter546 invariant: 破壊`,
    })
  }

  // 3. iter544 invariant: item-edit-cancel aria-label 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/aria-label=\{`「\$\{item\.title\}」の編集をキャンセル`\}/.test(ied)) {
    findings.push({
      level: 'info',
      message: `iter544 invariant: item-edit-cancel aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter544 invariant: 破壊`,
    })
  }

  // 4. iter515 anchor invariant
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

  console.log(`\n=== Findings (comment-edit-cancel-aria-iter547) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
