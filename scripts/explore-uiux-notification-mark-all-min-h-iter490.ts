/**
 * Phase 6.15 loop iter 490 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * NotificationBell popover header の「全て既読」 button に min-h-11 追加、codify。
 *
 * 課題: src/components/workspace/notification-bell.tsx 行 180-197 の Button が
 *   `size="sm"` (h-8 = 32px) で `className="min-h-11"` 漏れ。WCAG 2.5.5 AAA 違反。
 *
 *   iter462 で workspace utility 4 trigger button (Heartbeat / NotificationBell trigger /
 *   Preferences trigger / Theme) は 44x44 化済だが、popover 内の「全て既読」 button は漏れ。
 *
 * fix (1 ファイル 1 行追加):
 *   - `<Button type="button" variant="ghost" size="sm" ...>` に `className="min-h-11"` 挿入
 *
 * 累計 **111 button mobile target 達成** (iter460-490 で 25 fix iter)。
 * 機能不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert + iter462 (trigger button) integrity 維持 cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/notification-bell.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. 全て既読 Button に min-h-11 + size="sm" + variant="ghost" 配線
  if (
    /<Button\s+type="button"\s+variant="ghost"\s+size="sm"\s+className="min-h-11"[\s\S]{0,200}?data-testid="notification-mark-all-read"/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: 全て既読 Button min-h-11 + size=sm + variant=ghost OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: 全て既読 Button min-h-11 + size=sm + variant=ghost 不在`,
    })
  }

  // 2. data-testid + aria-label 維持 (regression)
  if (
    /data-testid="notification-mark-all-read"/.test(src) &&
    /aria-label=\{[\s\S]{0,300}?未読 \$\{unreadCount\} 件をすべて既読にする/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: data-testid + aria-label 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: data-testid + aria-label 破壊` })
  }

  // 3. iter462 invariant: trigger button (size="icon") の min-h-11 min-w-11 維持
  if (
    /<Button[\s\S]{0,500}?size="icon"[\s\S]{0,500}?className="relative min-h-11 min-w-11"/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: iter462 invariant (trigger size=icon min-h-11 min-w-11) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: iter462 invariant 破壊` })
  }

  // 4. CheckCheck icon の aria-hidden 維持 (regression)
  if (/<CheckCheck className="mr-1 h-3\.5 w-3\.5" aria-hidden="true" \/>/.test(src)) {
    findings.push({ level: 'info', message: `${path}: CheckCheck icon aria-hidden 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: CheckCheck icon aria-hidden 破壊` })
  }

  // 5. h2 popover heading 維持 (regression、id="notification-bell-heading" で検出)
  if (/<h2[\s\S]{0,200}?id="notification-bell-heading"[\s\S]{0,80}?>\s*\n?\s*通知/.test(src)) {
    findings.push({ level: 'info', message: `${path}: popover h2 heading 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: popover h2 heading 破壊` })
  }

  console.log(`\n=== Findings (notification-mark-all-min-h-iter490) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
