/**
 * Phase 6.15 loop iter 578 (mode-D Desktop a11y) —
 * CommentThread comment-edit-input Textarea に aria-invalid (whitespace-only) を補完。
 *
 * 課題: comment-thread.tsx 行 200-224 の comment-edit-input Textarea は required +
 *   aria-required を持つが aria-invalid 不在。iter577 で post 側の comment-input には
 *   付いたが、編集側 (CommentItem) は未対応だった。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-invalid={(body.length > 0 && body.trim() === '') || undefined}
 *
 * iter577 pattern を CommentItem 編集 Textarea に展開、10 form 統一達成。
 *
 * 検証: source-side regex assert + iter515-577 invariant cross-check。
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

  // 1. comment-edit-input Textarea aria-invalid (CommentItem 編集側)
  if (
    /data-testid=\{`comment-edit-input-\$\{comment\.id\}`\}|aria-label="コメント編集[\s\S]*?aria-invalid=\{\(body\.length > 0 && body\.trim\(\) === ''\) \|\| undefined\}/.test(
      ct,
    ) &&
    /aria-label="コメント編集[\s\S]*?aria-invalid=\{\(body\.length > 0 && body\.trim\(\) === ''\) \|\| undefined\}[\s\S]*?data-testid=\{`comment-edit-input/.test(
      ct,
    )
  ) {
    findings.push({
      level: 'info',
      message: `comment-thread.tsx: comment-edit-input aria-invalid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-thread.tsx: comment-edit-input aria-invalid 不在`,
    })
  }

  // 2. iter577 invariant: comment-input (post 側) aria-invalid 維持
  if (
    /data-testid="comment-input"[\s\S]*?aria-invalid=\{\(body\.length > 0 && body\.trim\(\) === ''\) \|\| undefined\}/.test(
      ct,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter577 invariant: comment-input (post) aria-invalid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter577 invariant: 破壊`,
    })
  }

  // 3. iter575 invariant: teDescription aria-invalid 維持
  const ctef = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (
    /id="teDescription"[\s\S]*?aria-invalid=\{\(description\.length > 0 && description\.trim\(\) === ''\)/.test(
      ctef,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter575 invariant: teDescription aria-invalid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter575 invariant: 破壊`,
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

  console.log(`\n=== Findings (comment-edit-textarea-aria-invalid-iter578) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
