/**
 * Phase 6.15 loop iter 746 (mode-D Desktop a11y) —
 * schedule-item-picker dialog に aria-keyshortcuts="Escape" を追加。
 *
 * 課題: schedule-item-picker.tsx 行 31-43 の `<div role="dialog" aria-modal="true">` は
 *   onKeyDown で Escape trap して onCancel するが、aria-keyshortcuts attribute が無く、
 *   SR ユーザは dialog focus 時にこの shortcut の存在を直接 channel として知れない。
 *   Modal dialog の Escape 閉じは標準 pattern だが、明示的な aria-keyshortcuts により
 *   SR は確実に discover できる。iter735-743 keyshortcuts sweep を dialog にも展開。
 *
 * fix (1 ファイル ~1 行差分):
 *   - dialog div に `aria-keyshortcuts="Escape"` を追加
 *
 * 検証: source-side regex assert + iter735-745 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sip = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (/aria-keyshortcuts="Escape"/.test(sip)) {
    findings.push({
      level: 'info',
      message: `schedule-item-picker dialog aria-keyshortcuts="Escape" 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `schedule-item-picker dialog aria-keyshortcuts="Escape" 追加 不完全`,
    })
  }

  // iter743 invariant: quick-add IMEInput
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  const qaMatches = qa.match(/aria-keyshortcuts="Enter"/g) ?? []
  if (qaMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter743 invariant: quick-add aria-keyshortcuts 維持 OK (${qaMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter743 invariant: 破壊` })
  }

  // iter741 invariant: personal-period-view
  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  const ppvMatches = ppv.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (ppvMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter741 invariant: personal-period-view aria-keyshortcuts 維持 OK (${ppvMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter741 invariant: 破壊` })
  }

  // iter736 invariant: comment-thread
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  const ctMatches = ct.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (ctMatches.length >= 3) {
    findings.push({
      level: 'info',
      message: `iter736 invariant: comment-thread aria-keyshortcuts 維持 OK (${ctMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter736 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor
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

  console.log(`\n=== Findings (schedule-picker-escape-iter746) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
