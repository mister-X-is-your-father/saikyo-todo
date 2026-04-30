/**
 * Phase 6.15 loop iter 427 (mode-D Desktop a11y) — NotificationBell popover の
 * "通知" ラベルが `<span>` で heading semantic を持たず、`<ul>` リストにも
 * aria-label が無い問題を修正、codify。
 *
 * 課題: src/components/workspace/notification-bell.tsx の popover header:
 *   ```tsx
 *   <span className="text-sm font-medium">通知</span>
 *   ```
 *   SR ユーザは heading navigation (h ショートカット) で popover 内に直行
 *   できず、Tab で順々に降りる必要あり。また `<ul>` 通知リストも aria-label
 *   不在で SR の list navigation で「list 通知 N 件」が伝わらない。
 *
 * fix: 1 ファイル ~5 行差分。
 *   - "通知" `<span>` を `<h2 id="notification-bell-heading">` に変更
 *     (visual サイズ text-sm 維持、heading semantic だけ追加)
 *   - 通知 `<ul>` に `aria-labelledby="notification-bell-heading"` 配線で
 *     list が「通知」を accessible name として持つように
 *
 * 機能追加なし、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。runtime test (popover open) は
 *   workspace + notification seed 必要なため省略。
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

  // 1. h2 + id + visible "通知"
  if (
    /<h2 className="text-sm font-medium" id="notification-bell-heading">\s*通知\s*<\/h2>/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: <h2 id="notification-bell-heading">通知</h2> OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: <h2 id="notification-bell-heading"> 不在`,
    })
  }

  // 2. 旧 <span>通知</span> の残存 (regression detector)
  if (/<span className="text-sm font-medium">通知<\/span>/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${path}: 旧 <span> "通知" 残存 (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: `${path}: 旧 <span> "通知" 不在 OK` })
  }

  // 3. <ul> に aria-labelledby 配線
  if (/<ul className="divide-y" aria-labelledby="notification-bell-heading">/.test(src)) {
    findings.push({ level: 'info', message: `${path}: <ul> aria-labelledby 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: <ul> aria-labelledby 不在` })
  }

  console.log(`\n=== Findings (notification-heading-iter427) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
