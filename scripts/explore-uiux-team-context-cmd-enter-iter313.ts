/**
 * Phase 6.15 loop iter 313 — team-context-editor Textarea に Cmd/Ctrl+Enter 保存。
 *
 * 課題: comment-thread (iter228 / iter229) で確立された Cmd/Ctrl+Enter pattern
 *   が他 Textarea 駆動 panel に展開されていなかった。team-context-editor は
 *   workspace_settings.team_context を編集する textarea + Save button (onClick) で、
 *   現在は Save button まで Tab 移動して Enter する 2-step keyboard UX。
 *   Slack / GitHub / Notion 標準の Cmd/Ctrl+Enter で送信できる方が一般的。
 *
 * fix: Textarea に `onKeyDown` を追加、`(metaKey || ctrlKey) + Enter` かつ
 *   `!nativeEvent.isComposing` (IME 確定中の Enter を除外) かつ `dirty` (未変更時
 *   は無反応) かつ `!upd.isPending` (二重送信防止) のとき `handleSave()` を呼出。
 *   placeholder と aria-label に "Cmd/Ctrl+Enter で保存" hint を追記。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/workspace/team-context-editor.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (!/\(e\.metaKey \|\| e\.ctrlKey\) &&\s*e\.key === 'Enter'/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: Cmd/Ctrl+Enter 判定不在` })
  }
  if (!/!e\.nativeEvent\.isComposing/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: IME 確定 ガード不在` })
  }
  if (!/Cmd\/Ctrl\+Enter で保存/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: hint 文言不在` })
  }

  // iter228 invariant: comment-thread の Cmd/Ctrl+Enter が依然存在
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (
    !/\(e\.metaKey \|\| e\.ctrlKey\) && e\.key === 'Enter' && !e\.nativeEvent\.isComposing/.test(ct)
  ) {
    findings.push({ level: 'warning', message: 'comment-thread.tsx: iter228 Cmd/Enter 回帰' })
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: `${target}: Cmd/Ctrl+Enter 保存 OK` })
  }

  console.log(`\n=== Findings (team-context-cmd-enter-iter313) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
