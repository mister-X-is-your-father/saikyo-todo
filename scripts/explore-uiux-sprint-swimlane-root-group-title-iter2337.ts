/**
 * Phase 6.15 loop iter2337: Sprint swim-lane root group に title 付与し aria-label
 * "Sprint「${name}」 担当者 swim-lane — lane N 件" と sync。engineer-trigger
 * group iter2207 / workspace-header ops group iter2229 / offline 復帰アクション
 * group iter2323 と同 role="group" title sync pattern を Sprint swim-lane root
 * group にも展開。
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

  const sl = readFileSync(
    resolve(here, '../src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (!sl.includes('iter2337')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-swimlane-disclosure iter2337 marker が無い',
    })
  }
  // aria + title 計 2 出現
  const expr = (
    sl.match(/`Sprint「\$\{sprintName\}」 担当者 swim-lane — lane \$\{rows\.length\} 件`/g) || []
  ).length
  if (expr < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `Sprint swimlane root group expression 出現 ${expr} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2335 regression guard
  const dp = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!dp.includes('iter2335')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2335 proposal MUST checkbox title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — Sprint swim-lane root group title sync 完了、role="group" title family 拡張',
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
