/**
 * Phase 6.15 loop iter2349: tag-picker CommandInput に title 付与し aria-label と sync
 * (command-palette CommandInput iter2345 と同 picker input title pattern、tag dual-mode
 * operator + 新規 tag 色 random caveat を hover disclose)。
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

  const tp = readFileSync(resolve(here, '../src/components/workspace/tag-picker.tsx'), 'utf8')
  if (!tp.includes('iter2349')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'tag-picker iter2349 marker が無い',
    })
  }
  // CommandInput aria-label + title 計 2 回出現
  const text = (
    tp.match(/タグ — Item に紐付けるラベルを検索 or 新規作成 \(新規 tag は色がランダム生成\)/g) ||
    []
  ).length
  if (text < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tag-picker CommandInput 出現 ${text} 回、aria-label + title 計 2 回必要`,
    })
  }

  // 既存 sibling element regression 検査
  if (!tp.includes('iter2339')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2339 tag option title が消えている',
    })
  }
  if (!tp.includes('iter2343')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2343 tag-create-new title が消えている',
    })
  }
  if (!tp.includes('iter2251')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2251 tag-picker PopoverContent title が消えている',
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
      '(なし) — tag-picker CommandInput title sync 完了、command-palette + tag-picker CommandInput 2 picker input family、assignee-picker CommandInput pending',
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
