/**
 * Phase 6.15 loop iter 898 (mode-M Mobile audit / iter889-897 follow-up) —
 * quick-add の 最頻 entry point input を min-h-11 化。
 *
 * 課題: quick-add は workspace 中で最も触られる input、h-8 では mobile target 不足、
 *   ハッシュタグ / 自然言語入力で誤タップ多。
 *
 * fix (1 ファイル 1 行差分): className="flex-1" → "min-h-11 flex-1"。
 *
 * 検証: source-side regex assert + iter897 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  if (/id="quick-add-input"[\s\S]{0,800}className="min-h-11 flex-1"/.test(qa)) {
    findings.push({
      level: 'info',
      message: `quick-add input min-h-11 適用 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `quick-add input min-h-11 未統合` })
  }

  // iter897 invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/id="src-name"[\s\S]{0,800}className="min-h-11"/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter897 invariant: integrations src-name min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter897 invariant: 破壊` })
  }

  // iter851 invariant
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: skip-link focus min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  console.log(`\n=== Findings (quick-add-input-mobile-target-iter898) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
