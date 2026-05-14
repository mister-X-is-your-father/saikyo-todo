/**
 * Phase 6.15 loop iter873 — archived-items-panel.tsx の Link title visible {item.title} を
 * aria-hidden span で wrap した regression guard。
 *
 * aria-label に既に item.title が含まれている (「${item.title}」を開く ...) → 二重読み上げ排除。
 *
 *   pnpm tsx scripts/explore-uiux-archive-title-link-aria-hidden-iter873.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/workspace/archived-items-panel.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  if (
    !/aria-label=\{`「\$\{item\.title\}」を開く[^`]*`\}[\s\S]{0,80}<span aria-hidden="true">\{item\.title\}<\/span>/.test(
      src,
    )
  ) {
    findings.push({
      level: 'error',
      message: 'archive title Link visible {item.title} の aria-hidden wrap が無い',
    })
  }

  // iter829 invariant: restore button visible wrap 健在
  if (
    !/<span aria-hidden="true">\{unarchive\.isPending \? '復元中…' : '復元'\}<\/span>/.test(src)
  ) {
    findings.push({ level: 'error', message: 'iter829 restore button wrap が消えた (regression)' })
  }

  console.log(`\n=== Findings (archive-title-link-aria-hidden iter873) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
