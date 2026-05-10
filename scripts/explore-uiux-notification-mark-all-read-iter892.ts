/**
 * Phase 6.15 loop iter 892 (mode-D Desktop a11y) —
 * notification-bell notification-mark-all-read button: WCAG 2.5.3 (Label in Name)
 * 違反 (kanji "全て" vs hiragana "すべて" の token mismatch) を修正 + visible aria-hidden 統合。
 *
 * 課題: src/components/workspace/notification-bell.tsx の notification-mark-all-read button:
 *   - visible "全て既読" は kanji "全て" を使うが、旧 aria-label "未読 N 件をすべて既読にする" は
 *     hiragana "すべて" + "既読" 間に "に" 挿入で乖離 → "全て既読" substring 不適合 → WCAG 2.5.3 違反
 *   - pending: visible "全て既読" / aria-label "未読 N 件を既読化中…" — 「全て既読」 token 自体無し
 *
 * fix (1 ファイル / +3-2 行差分):
 *   - aria-label normal: `全て既読 (未読 ${count} 件をすべて既読化)` → visible "全て既読" prefix 適合
 *   - aria-label pending: `全て既読化中… (未読 ${count} 件を既読化中)` → visible "全て既読" prefix 適合
 *   - visible "全て既読" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter890/891 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )

  // 1. normal aria-label に "全て既読" prefix
  if (/`全て既読 \(未読 \$\{unreadCount\} 件をすべて既読化\)`/.test(nb)) {
    findings.push({
      level: 'info',
      message: `notification-mark-all-read normal aria-label に "全て既読" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-mark-all-read normal aria-label が "全て既読" prefix 不含`,
    })
  }

  // 2. pending aria-label に "全て既読" prefix
  if (/`全て既読化中… \(未読 \$\{unreadCount\} 件を既読化中\)`/.test(nb)) {
    findings.push({
      level: 'info',
      message: `notification-mark-all-read pending aria-label に "全て既読" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-mark-all-read pending aria-label が "全て既読" prefix 不含`,
    })
  }

  // 3. visible "全て既読" span aria-hidden
  if (
    /data-testid="notification-mark-all-read"[\s\S]+?<span aria-hidden="true">全て既読<\/span>/.test(
      nb,
    )
  ) {
    findings.push({
      level: 'info',
      message: `notification-mark-all-read visible "全て既読" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-mark-all-read visible aria-hidden 未統合`,
    })
  }

  // 4. 旧 aria-label "すべて既読にする" 削除
  if (!/`未読 \$\{unreadCount\} 件をすべて既読にする`/.test(nb)) {
    findings.push({
      level: 'info',
      message: `notification-mark-all-read 旧 aria-label "すべて既読にする" 削除済 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `notification-mark-all-read 旧 aria-label 残存` })
  }

  // iter891 invariant: backlog-edit aria-hidden
  const bl = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (
    /data-testid=\{`backlog-edit-\$\{row\.original\.id\}`\}[\s\S]+?<span aria-hidden="true">編集<\/span>/.test(
      bl,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter891 invariant: backlog-edit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter891 invariant: backlog-edit 破壊` })
  }

  console.log(`\n=== Findings (notification-mark-all-read-iter892) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
