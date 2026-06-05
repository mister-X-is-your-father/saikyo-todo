/**
 * Phase 6.15 loop iter2343: tag-create-new CommandItem に title 付与し
 * aria-label query-dependent dynamic text と sync。assignee-picker user
 * iter2335 / tag-picker option iter2339 / assignee-picker agent iter2341 と同
 * CommandItem title pattern を tag-create-new にも展開、tag-picker option +
 * create-new family 完成。
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
  if (!tp.includes('iter2343')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'tag-picker iter2343 marker が無い',
    })
  }
  // tag-create-new expression aria + title 計 2 出現
  const expr = (
    tp.match(
      /`\$\{query\.trim\(\) \|\| '新規 tag'\} — 「\$\{query\.trim\(\)\}」を新規 tag として作成`/g,
    ) || []
  ).length
  if (expr < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `tag-create-new expression 出現 ${expr} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2341 regression guard
  const ap = readFileSync(resolve(here, '../src/components/workspace/assignee-picker.tsx'), 'utf8')
  if (!ap.includes('iter2341')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2341 assignee-picker AI agent title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — tag-create-new title sync 完了、tag-picker option + create-new family 完成',
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
