/**
 * Phase 6.15 loop iter1200: notification-bell.tsx 通知 item button aria-label visible-prefix +
 * WCAG 2.5.3 regression guard。
 *
 * iter1200 で発見した visible-prefix 違反: notification-bell.tsx `notification-item` button
 * 旧 aria-label `${'未読/既読'}${visual.label}通知: ${body}` は visible body (= button 内
 * 唯一の visible text 内容、`<p aria-hidden>{formatNotificationBody(n)}</p>`) を末尾 position に
 * 持ち、voice control prefix-matching「click <body 先頭語>」 match 不可 (substring 一致のみ)。
 *
 * 修正 (notification-bell.tsx):
 *   - 旧: `${'未読'|'既読'}${visual.label}通知: ${formatNotificationBody(n)}`
 *   - 新: `${formatNotificationBody(n)} — ${'未読'|'既読'}${visual.label}通知`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-notification-item-visible-prefix-iter1200.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))
  const filePath = resolve(here, '../src/components/workspace/notification-bell.tsx')
  const src = readFileSync(filePath, 'utf8')

  // 新 template literal が存在することを確認
  if (
    !src.includes(
      "aria-label={`${formatNotificationBody(n)} — ${n.readAt ? '既読' : '未読'}${visual.label}通知`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'notification-item button aria-label が visible body 冒頭固定 + em-dash 区切 convention で無い',
    })
  }

  // 旧 template literal の active code 残存を確認 (comment 内の言及は除外)
  const codeOnly = src
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n')
  if (
    codeOnly.includes(
      "aria-label={`${n.readAt ? '既読' : '未読'}${visual.label}通知: ${formatNotificationBody(n)}`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        '旧 aria-label `${未読/既読}${visual.label}通知: ${body}` (visible body 末尾持ち、voice control prefix-match 不可) が active code に残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — notification-item button aria-label は visible body 冒頭固定 (voice control prefix-match satisfy)',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
