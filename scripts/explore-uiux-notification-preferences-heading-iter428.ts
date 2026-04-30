/**
 * Phase 6.15 loop iter 428 (mode-D Desktop a11y) — NotificationPreferences
 * popover の "通知設定 (メール)" ラベルが `<p>` で heading semantic を持たず、
 * `<ul>` に aria-label 不在の問題を修正、codify (iter427 NotificationBell の
 * 同 pattern を水平展開)。
 *
 * 課題: src/components/workspace/notification-preferences.tsx の popover header:
 *   ```tsx
 *   <p className="text-sm font-medium">通知設定 (メール)</p>
 *   ```
 *   SR ユーザは heading navigation (h ショートカット) で popover 内に直行
 *   できず、Tab で順々に降りる必要あり。`<ul>` 4 toggle list も aria-label
 *   不在で「list 通知設定 4 件」が伝わらない。
 *
 * fix: 1 ファイル ~5 行差分 (iter427 と同 pattern)。
 *   - "通知設定 (メール)" `<p>` を `<h2 id="notification-preferences-heading">` に変更
 *     (visual サイズ text-sm 維持、heading semantic だけ追加)
 *   - 4 toggle `<ul>` に `aria-labelledby="notification-preferences-heading"` 配線
 *
 * 機能追加なし、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。runtime test (popover open) は
 *   workspace + notification preferences seed 必要なため省略。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/notification-preferences.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. h2 + id + visible "通知設定 (メール)"
  if (
    /<h2 id="notification-preferences-heading" className="text-sm font-medium">\s*通知設定 \(メール\)\s*<\/h2>/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: <h2 id="notification-preferences-heading">通知設定 (メール)</h2> OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: <h2 id="notification-preferences-heading"> 不在`,
    })
  }

  // 2. 旧 <p>通知設定 (メール)</p> の残存 (regression detector)
  if (/<p className="text-sm font-medium">通知設定 \(メール\)<\/p>/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${path}: 旧 <p> "通知設定 (メール)" 残存 (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: `${path}: 旧 <p> heading text 不在 OK` })
  }

  // 3. <ul> aria-labelledby 配線
  if (/<ul className="divide-y" aria-labelledby="notification-preferences-heading">/.test(src)) {
    findings.push({ level: 'info', message: `${path}: <ul> aria-labelledby 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: <ul> aria-labelledby 不在` })
  }

  // 4. iter427 (notification-bell) の同 pattern が消えていないか (consistency check)
  const bellSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (
    /<h2 className="text-sm font-medium" id="notification-bell-heading">\s*通知\s*<\/h2>/.test(
      bellSrc,
    )
  ) {
    findings.push({
      level: 'info',
      message: `notification-bell.tsx: iter427 h2 heading pattern 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-bell.tsx: iter427 h2 heading pattern 消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (notification-preferences-heading-iter428) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
