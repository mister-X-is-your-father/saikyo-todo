/**
 * Phase 6.15 loop iter 884 (mode-D Desktop a11y) —
 * tag-picker.tsx CommandItem 内 visible "{t.name}" を aria-hidden span で
 * wrap (iter800-883 sweep の続編)。
 *
 * 課題: tag-picker.tsx 行 154 の CommandItem は aria-label が完全 content
 *   (タグ「name」を付与する/解除) を含むのに、内側 visible "{t.name}" は
 *   aria-hidden 無し → SR で二重読み可能性。Item edit dialog → タグ picker の
 *   各候補 row。
 *
 * fix (1 ファイル ~1 行差分):
 *   - "{t.name}" visible を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/881/882/883 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')
  if (/<span aria-hidden="true">\{t\.name\}<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `iter884: tag-picker CommandItem name aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter884: tag-picker name aria-hidden 不在`,
    })
  }

  // iter883 invariant: activity-log detail toggle aria-hidden 維持
  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{open \? '詳細を閉じる' : '詳細を見る'\}<\/span>/.test(al)) {
    findings.push({
      level: 'info',
      message: `iter883 invariant: activity-log detail toggle aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter883 invariant: 破壊` })
  }

  // iter882 invariant: comment-thread 4 button aria-hidden 維持
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">編集<\/span>/.test(ct) &&
    /<span aria-hidden="true">削除<\/span>/.test(ct)
  ) {
    findings.push({
      level: 'info',
      message: `iter882 invariant: comment-thread aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter882 invariant: 破壊` })
  }

  // iter735 invariant: shadcn UI 未編集
  const tabs = readFileSync(resolve(process.cwd(), 'src/components/ui/tabs.tsx'), 'utf8')
  if (!/aria-hidden/.test(tabs)) {
    findings.push({ level: 'info', message: `iter735 invariant: shadcn/tabs.tsx 未編集 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `iter735 invariant: shadcn tabs.tsx に aria-hidden 編集が混入`,
    })
  }

  console.log(`\n=== Findings (iter884) ===`)
  if (findings.length === 0) console.log('(なし)')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
