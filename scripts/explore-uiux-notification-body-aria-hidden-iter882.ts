/**
 * Phase 6.15 loop iter882 — notification-bell.tsx の notification body <p> を aria-hidden
 * 化した regression guard。outer button aria-label に formatNotificationBody(n) が含まれる
 * ため SR には body は重複、aria-hidden で button aria-label 単独経路にする。<time> は
 * aria-label に含まれないので aria-hidden 外し SR に届ける。
 *
 *   pnpm tsx scripts/explore-uiux-notification-body-aria-hidden-iter882.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/workspace/notification-bell.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  // body <p> に aria-hidden="true"
  if (!/<p className="text-xs leading-snug" aria-hidden="true">/.test(src)) {
    findings.push({ level: 'error', message: 'notification body <p> aria-hidden が無い' })
  }

  // <time> は aria-hidden ない (relativeTime は SR に届ける必要)
  if (/<time[^>]*aria-hidden="true"/.test(src)) {
    findings.push({
      level: 'error',
      message: '<time> に誤って aria-hidden が付いた (relativeTime が SR から消える)',
    })
  }

  // outer button aria-label invariant
  if (!src.includes("${n.readAt ? '既読' : '未読'}${visual.label}通知:")) {
    findings.push({ level: 'error', message: 'button aria-label invariant 不一致' })
  }

  console.log(`\n=== Findings (notification-body-aria-hidden iter882) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
