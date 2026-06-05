/**
 * Phase 6.15 loop iter2403: REST source 4 JSON dot-path input (items / due / id / title)
 * に title 付与し aria-label state-dependent 2-path と sync (src-url iter2313 / src-token
 * iter2397 / src-project-ids iter2399 と同 integrations input title-aria sync pattern、
 * REST source path 設定 form の hover disclose 完備)。
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

  const ip = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (!ip.includes('iter2403')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'integrations-panel iter2403 marker が無い',
    })
  }
  // 4 path inputs 各々 aria-label + title 計 2 回出現
  const checks: Array<[string, string]> = [
    [
      "'items path \\(任意、JSON dot-path、省略で response root を items 配列とみなす — 例: data\\.items\\)'",
      'items',
    ],
    ["'due path \\(任意、各 item から期日を取り出す JSON dot-path — 例: due_date\\)'", 'due'],
    ["'id path \\(必須、各 item の一意 ID を取り出す JSON dot-path — 例: id\\)'", 'id'],
    [
      "'title path \\(必須、各 item のタイトルを取り出す JSON dot-path — 例: title または name\\)'",
      'title',
    ],
  ]
  for (const [pattern, name] of checks) {
    const re = new RegExp(pattern, 'g')
    const count = (ip.match(re) || []).length
    if (count < 2) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `src-${name}-path empty 出現 ${count} 回、aria-label + title 計 2 回必要`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — REST source 4 path input (items / due / id / title) title 2-path sync 完了、REST source path 設定 form の hover disclose 完備',
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
