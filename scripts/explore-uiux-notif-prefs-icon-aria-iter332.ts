/**
 * Phase 6.15 loop iter 332 — notification-preferences (workspace ヘッダ右端) の
 * Settings icon に aria-hidden 付与 + Button の aria-label を行動寄りに改善 +
 * aria-haspopup="dialog" 付与。
 *
 * 課題: (1) Button 子の `<Icon>` (Settings) に aria-hidden 無し → SR 実装に
 *       よっては "graphic" 等を冗長 announce。Button 自体に aria-label がある
 *       ので icon は decorative。
 *       (2) aria-label "通知設定" が短く、何を設定する button か内容不明。
 *           メール通知 4 種 (Heartbeat / Mention / Invite / Sync Failure)
 *           を ON/OFF できる旨を含めると行動見通しが向上。
 *       (3) `aria-haspopup="dialog"` 不在 (iter23 notification-bell には付与済
 *           で iter332 で対称化)。
 *
 * fix: (1) `<Icon ... aria-hidden="true" />` 追加。
 *      (2) aria-label を「通知設定 (メール通知 4 種を ON/OFF)」に拡充。
 *      (3) `aria-haspopup="dialog"` 追加。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル、約 4 行差替え。
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
  const target = 'src/components/workspace/notification-preferences.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  if (!/<Icon[^/]*aria-hidden="true"/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: Icon aria-hidden 不在` })
  }
  if (!/aria-label="通知設定 \(メール通知 4 種を ON\/OFF\)"/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: 拡充 aria-label 不在` })
  }
  if (!/aria-haspopup="dialog"/.test(src)) {
    findings.push({ level: 'warning', message: `${target}: aria-haspopup="dialog" 不在` })
  }
  if (findings.length === 0) {
    findings.push({ level: 'info', message: `${target}: notification-preferences a11y OK` })
  }

  console.log(`\n=== Findings (notif-prefs-icon-aria-iter332) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
