/**
 * Phase 6.15 loop iter2377: notification-bell list の各 <time> 要素に title 付与し
 * aria-label と sync (dashboard <time> cross-view pattern と同 time element title sync、
 * 通知 list の relative + absolute 両方 hover disclose 完備)。
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

  const nb = readFileSync(
    resolve(here, '../src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (!nb.includes('iter2377')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'notification-bell iter2377 marker が無い',
    })
  }
  // formatRelativeTime + toISOString 連結 expression 2 回 (aria-label + title)
  const timeExpr = (
    nb.match(
      /`\$\{formatRelativeTime\(n\.createdAt\)\} — \$\{n\.createdAt instanceof Date \? n\.createdAt\.toISOString\(\) : new Date\(n\.createdAt\)\.toISOString\(\)\}`/g,
    ) || []
  ).length
  if (timeExpr < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `<time> aria-label + title 出現 ${timeExpr} 回、2 回必要`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — notification-bell <time> title sync 完了、通知 list relative + absolute time 両方 hover disclose 完備',
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
