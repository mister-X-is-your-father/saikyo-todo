/**
 * Phase 6.15 loop iter2211: engineer-trigger-btn に title 付与し aria-label と sync
 * (engineer-auto-pr iter2209 / engineer-trigger-group iter2207 と pair、
 *  engineer family title 同期 3 element 完成)。
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

  const et = readFileSync(
    resolve(here, '../src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  if (
    !et.includes('iter2211') ||
    !et.includes('起動中… — Engineer Agent に「${item.title}」を投入中')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'engineer-trigger-btn title が aria-label と sync されていない',
    })
  }
  const iterEng = (et.match(/iter22(07|09|11)/g) ?? []).length
  if (iterEng < 3) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `engineer family 3 element marker 不足 (count=${iterEng})`,
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
      '(なし) — engineer-trigger-btn title 同期、engineer family 3 element 完成 (group/auto-pr/btn)',
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
