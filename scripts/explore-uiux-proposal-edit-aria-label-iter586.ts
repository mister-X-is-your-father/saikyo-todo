/**
 * Phase 6.15 loop iter 586 (mode-D Desktop a11y) —
 * decompose-proposals-panel proposal edit button に明示的 aria-label を補完。
 *
 * 課題: decompose-proposals-panel.tsx 行 471-486 の proposal edit button は visible
 *   text content (title + MUST badge + 切り詰め description) で SR の accessible name
 *   が形成されるが、line-clamp-2 で long description が読み上げに混入し identification
 *   が不明瞭になる。明示的 aria-label で「提案「title」を編集 (+ MUST)」に集約すべき。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label={`提案「${proposal.title}」を編集${proposal.isMust ? ' (MUST)' : ''}`}
 *
 * iter531/532/533/534/535 (title-button aria-label 統一) pattern を proposal edit に
 * 水平展開、SR navigation の identification を統一。
 *
 * 検証: source-side regex assert + iter515-585 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // 1. proposal-edit-btn aria-label
  if (
    /data-testid=\{`proposal-\$\{proposal\.id\}-edit-btn`\}\s*\n\s*aria-label=\{`提案「\$\{proposal\.title\}」を編集/.test(
      dpp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel.tsx: proposal-edit-btn aria-label 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel.tsx: proposal-edit-btn aria-label 不在`,
    })
  }

  // 2. iter585 invariant: bulk-action-bar aria-busy
  const bb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (
    /disabled=\{bulkStatus\.isPending\}\s*\n\s*aria-busy=\{bulkStatus\.isPending \|\| undefined\}/.test(
      bb,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter585 invariant: bulk-action-bar bulk-status aria-busy 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter585 invariant: 破壊`,
    })
  }

  // 3. iter580 invariant: decompose-proposals save aria-keyshortcuts 維持
  if (
    /data-testid=\{`proposal-\$\{proposal\.id\}-save`\}\s*\n\s*aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(
      dpp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter580 invariant: decompose-proposals save aria-keyshortcuts 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter580 invariant: 破壊`,
    })
  }

  // 4. iter515 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (proposal-edit-aria-label-iter586) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
