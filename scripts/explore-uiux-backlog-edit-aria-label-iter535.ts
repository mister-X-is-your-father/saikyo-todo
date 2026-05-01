/**
 * Phase 6.15 loop iter 535 (mode-D Desktop a11y) —
 * BacklogView 編集 Button (action cell 内) に aria-label を補完。
 *
 * 課題: backlog-view.tsx 行 168-179 の 編集 Button は visible text "編集" のみ + data-testid あり、
 *   aria-label が無い。Backlog table の action cell には 4 button (編集 / AI 分解 / AI 調査 /
 *   タイマー) が並ぶが、編集 のみ aria-label 不在で SR に「どの item の編集か」が伝わらない。
 *   他 button (decompose / research / start-timer) は item.title 込みで aria-label を持つ
 *   (iter331 / iter435 等)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - 編集 Button に aria-label={`「${row.original.title}」を編集`}
 *
 * iter531 (backlog title cell) と整合、これで Backlog row 内すべての button が
 * SR-friendly な item 識別 aria-label を持つ。
 *
 * 機能不変、視覚 layout 不変 (min-h-11 維持)、shadcn 編集なし、data-testid /
 * onClick / e.stopPropagation invariant 維持。
 *
 * 検証: source-side regex assert + iter515-534 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )

  // 1. 編集 Button aria-label
  if (
    /data-testid=\{`backlog-edit-\$\{row\.original\.id\}`\}\s+aria-label=\{`「\$\{row\.original\.title\}」を編集`\}/.test(
      bv,
    ) ||
    /aria-label=\{`「\$\{row\.original\.title\}」を編集`\}\s+data-testid=\{`backlog-edit-\$\{row\.original\.id\}`\}/.test(
      bv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `backlog-view.tsx: 編集 Button aria-label 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `backlog-view.tsx: 編集 Button aria-label 不在`,
    })
  }

  // 2. iter531 invariant: title cell aria-label 維持
  if (/aria-label=\{`「\$\{String\(getValue\(\)\)\}」を編集`\}/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter531 invariant: backlog-view title aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter531 invariant: backlog-view title aria-label 破壊`,
    })
  }

  // 3. iter534 invariant: personal-period title aria-label 維持
  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (
    /data-testid=\{`period-title-\$\{period\}-\$\{it\.id\}`\}\s+aria-label=\{`「\$\{it\.title\}」を編集`\}/.test(
      ppv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter534 invariant: personal-period-view title aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter534 invariant: personal-period-view aria-label 破壊`,
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
      message: `iter515 invariant: integrations-panel 履歴 toggle aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: integrations-panel aria-label 破壊`,
    })
  }

  console.log(`\n=== Findings (backlog-edit-aria-label-iter535) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
