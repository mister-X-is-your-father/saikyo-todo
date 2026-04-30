/**
 * Phase 6.15 loop iter 466 (mode-D source-side audit) — BulkActionBar の
 * inline action button を 44x44 化 (iter460-465 mobile sweep の続編、5 件目)。
 *
 * 課題: src/components/workspace/bulk-action-bar.tsx は bulk-status-${key} /
 *   bulk-delete / bulk-clear の 3 種 button (status は statuses 配列で動的に
 *   N 件) が `size="sm"` (h-8=32px)、mobile WCAG 違反。複数 item 選択時に
 *   表示される下部 sticky bar で頻繁に使われる。
 *
 * fix: 1 ファイル ~3 行差分。
 *   - 3 Button (status / delete / clear) に `className="min-h-11"` 追加
 *
 * 機能追加なし、視覚 layout は height 32→44px のみ、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/bulk-action-bar.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // status button (`<Button size="sm" className="min-h-11">` の中で variant=outline)
  if (
    /size="sm"\s+className="min-h-11"\s+variant="outline"\s+disabled=\{bulkStatus\.isPending\}/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: status button min-h-11 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: status button min-h-11 不在` })
  }

  // delete button
  if (
    /size="sm"\s+className="min-h-11"\s+variant="destructive"\s+disabled=\{bulkDelete\.isPending\}/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: delete button min-h-11 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: delete button min-h-11 不在` })
  }

  // clear button
  if (
    /size="sm"\s+className="min-h-11"\s+variant="ghost"\s+onClick=\{\(\) => clear\(\)\}/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: clear button min-h-11 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: clear button min-h-11 不在` })
  }

  console.log(`\n=== Findings (mobile-bulk-action-bar-iter466) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
