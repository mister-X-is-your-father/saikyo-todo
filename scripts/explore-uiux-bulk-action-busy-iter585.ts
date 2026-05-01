/**
 * Phase 6.15 loop iter 585 (mode-D Desktop a11y) —
 * bulk-action-bar の status / delete Button に aria-busy を補完。
 *
 * 課題: bulk-action-bar.tsx 行 78-110 で status / delete Button は disabled で
 *   pending 状態を表現しているが、aria-busy 不在。SR は disabled = "押せない" と
 *   announce するだけで「処理中」の状態は伝わらない。aria-label 側で "...中…"
 *   は伝わるが、ARIA 1.1 の aria-busy attribute は assistive tech に対して
 *   programmatic に "loading" 状態を expose するための標準。
 *
 * fix (1 ファイル ~2 行差分):
 *   - status Button: aria-busy={bulkStatus.isPending || undefined}
 *   - delete Button: aria-busy={bulkDelete.isPending || undefined}
 *
 * iter526 (quick-add submit) / iter529 (notification mark-all-read) / iter530
 * (item-checkbox) 等の aria-busy 付与 pattern を bulk-action-bar に水平展開。
 *
 * 検証: source-side regex assert + iter515-584 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )

  // 1. bulk-status Button aria-busy
  if (
    /disabled=\{bulkStatus\.isPending\}\s*\n\s*aria-busy=\{bulkStatus\.isPending \|\| undefined\}/.test(
      bb,
    )
  ) {
    findings.push({
      level: 'info',
      message: `bulk-action-bar.tsx: bulk-status Button aria-busy 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-action-bar.tsx: bulk-status Button aria-busy 不在`,
    })
  }

  // 2. bulk-delete Button aria-busy
  if (
    /disabled=\{bulkDelete\.isPending\}\s*\n\s*aria-busy=\{bulkDelete\.isPending \|\| undefined\}/.test(
      bb,
    )
  ) {
    findings.push({
      level: 'info',
      message: `bulk-action-bar.tsx: bulk-delete Button aria-busy 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `bulk-action-bar.tsx: bulk-delete Button aria-busy 不在`,
    })
  }

  // 3. iter584 invariant: comment-save (編集) aria-keyshortcuts 維持
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (
    /data-testid=\{`comment-save-\$\{comment\.id\}`\}\s*\n\s*aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(
      ct,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter584 invariant: comment-save (編集) aria-keyshortcuts 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter584 invariant: 破壊`,
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

  console.log(`\n=== Findings (bulk-action-busy-iter585) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
