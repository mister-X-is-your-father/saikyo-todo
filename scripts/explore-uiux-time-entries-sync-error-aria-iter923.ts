/**
 * Phase 6.15 loop iter 923 (mode-D Desktop a11y) —
 * time-entries-table 内 sync-error div の visible {e.syncError} を aria-hidden 化、
 * parent div aria-label "同期エラー: ${e.syncError}" 単独 SR 経路に統一
 * (iter914/920/921 pattern を time-entries-table sync error に展開、同 pattern
 * 6 件目)。
 *
 * 経緯: parent div aria-label "同期エラー: ${syncError}" が完全 content を持つにも
 *   関わらず内側 visible {syncError} は aria-hidden 無し → SR が 2 経路 (prefix 有 / 無)
 *   で同 error 文字列を二重読み。
 *
 * 修正 (+1/-1 行、1 file): 内側 visible {e.syncError} を <span aria-hidden="true">
 *   で wrap。parent aria-label / title / data-testid 維持 (mouse hover + a11y tree)。
 *
 * 検証: source-side regex assert + iter735/921 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tet = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )

  // 1. sync-error div 内側 aria-hidden 追加 OK
  if (
    /aria-label=\{`同期エラー: \$\{e\.syncError\}`\}[\s\S]*?<span aria-hidden="true">\{e\.syncError\}<\/span>/.test(
      tet,
    )
  ) {
    findings.push({
      level: 'info',
      message: `time-entries sync-error 内側 aria-hidden 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `time-entries sync-error 内側 aria-hidden 欠落`,
    })
  }

  // 2. parent div aria-label / title / data-testid 維持
  if (
    /title=\{e\.syncError\}[\s\S]*?aria-label=\{`同期エラー: \$\{e\.syncError\}`\}[\s\S]*?data-testid=\{`sync-error-\$\{e\.id\}`\}/.test(
      tet,
    )
  ) {
    findings.push({
      level: 'info',
      message: `time-entries sync-error parent 属性維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `time-entries sync-error parent 属性破壊`,
    })
  }

  // 3. iter921 invariant: SyncBadge 3 variant aria-label "外部同期: ..."
  if (
    /aria-label="外部同期: 完了"/.test(tet) &&
    /aria-label="外部同期: 失敗"/.test(tet) &&
    /aria-label="外部同期: 未実行"/.test(tet)
  ) {
    findings.push({
      level: 'info',
      message: `iter921 invariant: SyncBadge 3 variant aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter921 invariant: 破壊` })
  }

  // iter920 invariant: inbox 健全性 chip 内側 aria-hidden
  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  if (
    /aria-label=\{`Inbox 健全性: \$\{healthChip\.label\}`\}\s*>\s*<span aria-hidden="true">\{healthChip\.label\}<\/span>/.test(
      iv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter920 invariant: inbox 健全性 chip 内側 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter920 invariant: 破壊` })
  }

  // iter735 invariant
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

  console.log(`\n=== Findings (time-entries-sync-error-aria-iter923) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
