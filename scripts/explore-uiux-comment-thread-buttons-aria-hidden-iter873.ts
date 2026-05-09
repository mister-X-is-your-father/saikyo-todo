/**
 * Phase 6.15 loop iter 873 (mode-D Desktop a11y) —
 * comment-thread 4 button (cancel / save / edit / delete) visible を
 * aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/comment-thread.tsx の 4 button:
 *   - 編集 form cancel "キャンセル"
 *   - 編集 form save "保存"
 *   - 通常 mode edit "編集"
 *   - 通常 mode delete "削除"
 *
 *   いずれも aria-label が完全 content (コメント先頭 30 文字 + 操作) を含むのに
 *   visible が aria-hidden 無し → SR 2 経路読み上げ重複。Comment が複数並ぶ
 *   thread で 4 button × N 件分の重複が累積。iter844-872 と同 vocabulary、
 *   comment domain 規約一致達成。
 *
 * fix (1 ファイル +4/-4 行):
 *   - 4 visible text を <span aria-hidden="true">...</span> で wrap
 *
 * 検証: source-side regex assert + iter872 / iter871 invariant cross-check。
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

  const checks: Array<[string, RegExp]> = [
    ['cancel', /<span aria-hidden="true">キャンセル<\/span>/],
    ['save', /<span aria-hidden="true">保存<\/span>/],
    ['edit', /<span aria-hidden="true">編集<\/span>/],
    ['delete', /<span aria-hidden="true">削除<\/span>/],
  ]
  for (const [name, re] of checks) {
    if (re.test(ct)) {
      findings.push({ level: 'info', message: `iter873: comment ${name} button aria-hidden OK` })
    } else {
      findings.push({
        level: 'warning',
        message: `iter873: comment ${name} button aria-hidden 不完全`,
      })
    }
  }

  // invariant: aria-label 維持
  if (
    /aria-label="コメントの編集をキャンセル"/.test(ct) &&
    /aria-label=\{[\s\S]*?'コメントの編集を保存 \(Cmd\/Ctrl\+Enter でも可\)'/.test(ct)
  ) {
    findings.push({
      level: 'info',
      message: `iter873 invariant: comment cancel/save aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter873 invariant: aria-label 破壊` })
  }

  // iter872 invariant: subtasks-bulk-add aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">[\s\S]*?\{create\.isPending \? '追加中…' : `\$\{pendingTitleCount\} 件追加`\}[\s\S]*?<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter872 invariant: subtasks-bulk-add 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter872 invariant: 破壊` })
  }

  console.log(`\n=== Findings (comment-thread-buttons-aria-hidden-iter873) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
