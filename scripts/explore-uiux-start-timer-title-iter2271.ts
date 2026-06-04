/**
 * Phase 6.15 loop iter2271: start-timer-button (idle 通常 path) の title を accessibleLabel
 * と full sync (旧 title は otherActive 時のみで normal idle で undefined だった、MCP path A
 * 経由発見の title-aria divergence 修正)。
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

  const stb = readFileSync(
    resolve(here, '../src/components/workspace/start-timer-button.tsx'),
    'utf8',
  )
  if (!stb.includes('iter2271') || !stb.includes('title={accessibleLabel}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'start-timer-button (idle) title が accessibleLabel と sync されていない',
    })
  }
  // 旧 `title={otherActive ? fullHint : undefined}` が消えていること
  if (stb.includes('title={otherActive ? fullHint : undefined}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 title={otherActive ? fullHint : undefined} pattern が残っている',
    })
  }

  const qa = readFileSync(resolve(here, '../src/components/workspace/quick-add.tsx'), 'utf8')
  if (!qa.includes('iter2269')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2269 QuickAdd preview title が消えている',
    })
  }

  const home = readFileSync(resolve(here, '../src/app/page.tsx'), 'utf8')
  if (!home.includes('iter2267')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2267 Workspace 一覧 ul title が消えている',
    })
  }

  const mustBadge = readFileSync(
    resolve(here, '../src/components/workspace/must-badge.tsx'),
    'utf8',
  )
  if (!mustBadge.includes('title="MUST タスク"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1843 MustBadge title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — start-timer (idle) title accessibleLabel full sync 完了、normal idle path の hover disclose 補完 (MCP path A 経由発見)',
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
