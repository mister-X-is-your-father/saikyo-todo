/**
 * Phase 6.15 loop iter 864 (mode-D Desktop a11y) —
 * comment-thread コメント投稿 (comment-post) submit button:
 * WCAG 2.5.3 (Label in Name) 違反 + 動詞 vocab 不一致を根治。
 *
 * 課題: src/components/workspace/comment-thread.tsx の comment-post submit
 *   button は visible pending text "送信中…" を持つが aria-label は
 *   "コメントを投稿中…" — 動詞が **送信 vs 投稿** で完全に別 vocab。
 *   visible "送信中…" は aria-label の strict substring に **ならない**
 *   (= name に visible 含まれず WCAG 2.5.3 失敗、voice control「送信中」
 *   発話で name 一致せず)。idle visible "投稿" は aria-label "コメントを
 *   投稿..." の substring 満たすが path 統一。
 *
 * fix (1 ファイル ~3 行差分):
 *   - pending visible 動詞を「送信中…」 → 「投稿中…」 に揃え (= sighted
 *     ユーザの mental model も「投稿」 に統一、UX 一貫性向上)。
 *   - visible 全 path (idle "投稿" + pending "投稿中…") を <span aria-hidden>
 *     で wrap、aria-label 単独経路に統一 (iter844-863 同 pattern)。
 *   - aria-label の Cmd/Ctrl+Enter / @user 言及 hint は維持。
 *
 * 検証: source-side regex assert + iter735-863 invariant cross-check。
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

  // 1. comment-post visible aria-hidden + 動詞 vocab 統一 (送信中→投稿中)
  if (
    /<span aria-hidden="true">\s*\{create\.isPending \? '投稿中…' : '投稿'\}\s*<\/span>/.test(
      ct,
    )
  ) {
    findings.push({
      level: 'info',
      message: `comment-post visible aria-hidden + 動詞「投稿」統一 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-post visible aria-hidden / 動詞統一 未実装`,
    })
  }

  // 2. comment-post 旧 "送信中…" は visible に残らない (vocab regression 防止)
  if (!/'送信中…'/.test(ct)) {
    findings.push({
      level: 'info',
      message: `comment-post 旧 "送信中…" vocab 残存なし OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-post 旧 "送信中…" vocab 残存`,
    })
  }

  // 3. comment-post aria-label に Cmd/Ctrl+Enter + @user hint 維持
  if (/'コメントを投稿 \(Cmd\/Ctrl\+Enter でも可、@user で言及・通知\)'/.test(ct)) {
    findings.push({
      level: 'info',
      message: `comment-post aria-label (shortcut + @user hint) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-post aria-label 文脈破壊`,
    })
  }

  // 4. data-testid + aria-keyshortcuts 維持
  if (/data-testid="comment-post"/.test(ct) && /aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(ct)) {
    findings.push({
      level: 'info',
      message: `comment-post testid + aria-keyshortcuts 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `comment-post testid / keyshortcuts 破壊` })
  }

  // iter863 invariant: subtasks-bulk-add visible aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\s*\{create\.isPending \? '追加中…' : `\$\{pendingTitleCount\} 件追加`\}\s*<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter863 invariant: subtasks-bulk-add visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter863 invariant 破壊` })
  }

  // iter862 invariant: create-time-entry-submit visible aria-hidden
  const cef = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{create\.isPending \? '\.\.\.' : '記録'\}<\/span>/.test(cef)) {
    findings.push({
      level: 'info',
      message: `iter862 invariant: create-time-entry-submit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter862 invariant 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (comment-post-aria-hidden-iter864) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
