/**
 * Phase 6.15 loop iter2351: assignee-picker CommandInput に title 付与し aria-label と sync
 * (command-palette CommandInput iter2345 / tag-picker CommandInput iter2349 と同 picker input
 * title pattern、3 picker input family 完成)。
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

  const ap = readFileSync(resolve(here, '../src/components/workspace/assignee-picker.tsx'), 'utf8')
  if (!ap.includes('iter2351')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'assignee-picker iter2351 marker が無い',
    })
  }
  // CommandInput aria-label + title 計 2 回出現
  const text = (ap.match(/アサイン候補 — workspace メンバー \/ AI Agent を検索/g) || []).length
  if (text < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `assignee-picker CommandInput 出現 ${text} 回、aria-label + title 計 2 回必要`,
    })
  }

  // 既存 user (iter2335) / AI agent (iter2341) regression 検査
  if (!ap.includes('iter2335')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2335 user CommandItem title が消えている',
    })
  }
  if (!ap.includes('iter2341')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2341 AI agent CommandItem title が消えている',
    })
  }

  // picker input family の sibling regression 検査
  const tp = readFileSync(resolve(here, '../src/components/workspace/tag-picker.tsx'), 'utf8')
  if (!tp.includes('iter2349')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2349 tag-picker CommandInput title が消えている',
    })
  }
  const cp = readFileSync(resolve(here, '../src/components/shared/command-palette.tsx'), 'utf8')
  if (!cp.includes('iter2345')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2345 command-palette CommandInput title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — assignee-picker CommandInput title sync 完了、3 picker input family (command-palette + tag-picker + assignee-picker) 完成',
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
