/**
 * Phase 6.15 loop iter 314 — personal-period-view (週/月/四半期 ゴール) Textarea に
 * Cmd/Ctrl+Enter 保存。
 *
 * 課題: iter228 comment-thread / iter229 comment edit / iter313 team-context と
 *   同 pattern が漏れていた最後の主要 Textarea panel。週次 / 月次 / 四半期 ゴール
 *   は Period_Goal を編集するシーンで頻繁に Cmd+Enter を期待されるが、現状は
 *   Tab → Save button → Enter の 2-step 移動が必要。
 *
 * fix: Textarea に `onKeyDown` で `(metaKey || ctrlKey) + Enter` かつ
 *   `!nativeEvent.isComposing` (IME 確定中) かつ `dirty` (未変更時 noop) かつ
 *   `!upsertGoal.isPending` (二重送信防止) で `handleSave()` を呼出。placeholder
 *   と aria-label に "Cmd/Ctrl+Enter で保存" hint を append。
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
  const target = 'src/components/workspace/personal-period-view.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (
    !/\(e\.metaKey \|\| e\.ctrlKey\) &&\s*e\.key === 'Enter' &&\s*!e\.nativeEvent\.isComposing/.test(
      src,
    )
  ) {
    findings.push({ level: 'warning', message: `${target}: Cmd/Ctrl+Enter 判定不在` })
  }
  if (!/upsertGoal\.isPending/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: upsertGoal.isPending 参照不在` })
  }
  if (!/Cmd\/Ctrl\+Enter で保存/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: hint 文言不在` })
  }

  // iter313 invariant: team-context-editor の Cmd/Ctrl+Enter 維持
  const tc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  if (!/\(e\.metaKey \|\| e\.ctrlKey\) &&\s*e\.key === 'Enter'/.test(tc)) {
    findings.push({ level: 'warning', message: 'team-context-editor.tsx: iter313 回帰' })
  }
  // iter228 invariant: comment-thread の Cmd/Ctrl+Enter 維持
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (
    !/\(e\.metaKey \|\| e\.ctrlKey\) && e\.key === 'Enter' && !e\.nativeEvent\.isComposing/.test(ct)
  ) {
    findings.push({ level: 'warning', message: 'comment-thread.tsx: iter228 回帰' })
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: `${target}: Cmd/Ctrl+Enter 保存 OK` })
  }

  console.log(`\n=== Findings (period-goal-cmd-enter-iter314) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
