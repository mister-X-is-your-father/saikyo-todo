/**
 * Phase 6.15 loop iter 921 (mode-D Desktop a11y) —
 * kanban-view card 内 child-count chip "子 N 件" に aria-label "子タスク N 件" 追加
 * + 内側 visible を aria-hidden 化、SR では「子タスク」 full word で曖昧性排除。
 *
 * 経緯: 旧 chip は plain visible "子 N 件" のみで aria-label 無し → SR は context 無しに
 *   "子 5 件" と announce、「子」 short form は SR ユーザ (特に native 以外) に曖昧。
 *   兄弟 chip (kanban-decompose-wrapper / MustBadge) は aria-label 付き chip pattern を
 *   使う中で、child-count chip だけ無防備な visible only。
 *
 * 修正 (+2/-1 行、1 file):
 *   - chip span に aria-label="子タスク ${childCount} 件" 追加 (full word で曖昧性排除)
 *   - 内側 visible "子 ${count} 件" を <span aria-hidden="true"> で wrap
 *   - data-testid 維持 (E2E + a11y tree 経路保全)
 *
 * 検証: source-side regex assert + iter735/920 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )

  // 1. child-count chip に aria-label 追加 OK
  if (/aria-label=\{`子タスク \$\{childCount\} 件`\}/.test(kv)) {
    findings.push({
      level: 'info',
      message: `kanban child-count chip aria-label 追加 OK (full word で曖昧性排除)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `kanban child-count chip aria-label 欠落`,
    })
  }

  // 2. child-count chip 内側 aria-hidden 追加 OK
  if (/<span aria-hidden="true">子 \{childCount\} 件<\/span>/.test(kv)) {
    findings.push({
      level: 'info',
      message: `kanban child-count chip 内側 aria-hidden 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `kanban child-count chip 内側 aria-hidden 欠落`,
    })
  }

  // 3. chip data-testid 維持
  if (/data-testid=\{`kanban-child-count-\$\{item\.id\}`\}/.test(kv)) {
    findings.push({
      level: 'info',
      message: `kanban child-count chip data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `kanban child-count chip data-testid 破壊`,
    })
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

  console.log(`\n=== Findings (kanban-child-count-aria-iter921) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
