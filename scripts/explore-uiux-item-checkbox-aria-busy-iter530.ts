/**
 * Phase 6.15 loop iter 530 (mode-D Desktop a11y) —
 * ItemCheckbox に aria-busy + 動的 aria-label を補完。
 *
 * 課題: item-checkbox.tsx 行 56-69 の button (Today / Inbox / Kanban / Backlog 共通) は
 *   disabled={toggle.isPending} はあるが aria-busy 不在。
 *   pending 中の aria-label も完了/未完了の static 切替のみで「切替中…」状態が伝わらない。
 *   ItemCheckbox は最も頻繁に使われる UI で、SR ユーザは pending 状態を察知できないと
 *   click 後 toast まで反応が分からない。
 *
 * fix (1 ファイル ~6 行差分):
 *   - aria-busy={toggle.isPending || undefined}
 *   - aria-label を 3 状態化 (pending / 完了→未完了 / 未完了→完了)
 *
 * iter521-529 form/Button aria-busy sweep を最頻 UI item-checkbox に展開。
 * 機能不変、視覚 layout 不変、shadcn 編集なし、role / aria-checked / data-checked /
 * data-testid / iter505 (pseudo tap target before:-inset-3) invariant 維持。
 *
 * 検証: source-side regex assert + iter515-529 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ic = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-checkbox.tsx'),
    'utf8',
  )

  // 1. aria-busy 配線
  if (/aria-busy=\{toggle\.isPending \|\| undefined\}/.test(ic)) {
    findings.push({
      level: 'info',
      message: `item-checkbox.tsx: aria-busy 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-checkbox.tsx: aria-busy 不在`,
    })
  }

  // 2. aria-label 3 状態化 (pending 含む)
  if (
    /toggle\.isPending\s*\?\s*`「\$\{item\.title\}」の完了状態を切替中…`\s*:\s*`「\$\{item\.title\}」を\$\{isDone \? '未完了に戻す' : '完了にする'\}`/.test(
      ic,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-checkbox.tsx: aria-label 3 状態化 (pending / 未完了→完了 / 完了→未完了) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-checkbox.tsx: aria-label 3 状態化 不在`,
    })
  }

  // 3. iter505 (pseudo tap target) + role / aria-checked / data-testid 維持
  if (
    /before:absolute before:-inset-3/.test(ic) &&
    /role="checkbox"/.test(ic) &&
    /aria-checked=\{isDone\}/.test(ic) &&
    /data-testid=\{`item-checkbox-\$\{item\.id\}`\}/.test(ic)
  ) {
    findings.push({
      level: 'info',
      message: `item-checkbox.tsx: iter505 pseudo + role / aria-checked / data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-checkbox.tsx: iter505 / role / aria-checked / data-testid 破壊`,
    })
  }

  // 4. iter515-529 invariant cross-check (anchor 3 件)
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const ok515 = /aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)
  const ok525 = (sp.match(/aria-busy=\{changing \|\| undefined\}/g) ?? []).length === 4
  const ok529 =
    /data-testid="notification-mark-all-read"[\s\S]{0,400}aria-busy=\{markAllRead\.isPending \|\| undefined\}|aria-busy=\{markAllRead\.isPending \|\| undefined\}[\s\S]{0,400}data-testid="notification-mark-all-read"/.test(
      nb,
    )
  if (ok515 && ok525 && ok529) {
    findings.push({
      level: 'info',
      message: `iter515-529 invariant: 重要 anchor 3 件維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515-529 invariant: 破壊 (515=${ok515} 525=${ok525} 529=${ok529})`,
    })
  }

  console.log(`\n=== Findings (item-checkbox-aria-busy-iter530) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
