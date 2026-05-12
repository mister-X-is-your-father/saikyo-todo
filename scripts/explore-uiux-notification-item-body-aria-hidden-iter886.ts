/**
 * Phase 6.15 loop iter 886 (mode-D Desktop a11y) —
 * notification-bell.tsx notification-item button 内 <p> body を aria-hidden 化
 * (iter800-885 sweep の続編)。
 *
 * 課題: notification-bell.tsx 行 247-256 の notification-item button は
 *   aria-label が完全 content ("${readAt ? '既読' : '未読'}${type}通知:
 *   ${body}") を含むのに、内側 <p> の content (未読 dot + body text) は
 *   aria-hidden 無し → SR で二重読み可能性 (button の aria-label と <p> の inner
 *   text 両方読み上げ)。未読 dot span は独立 aria-label="未読" を持つので
 *   "未読" が 3 重 announce される可能性すらある。
 *
 * fix (1 ファイル ~2 行差分):
 *   - <p> 全体に aria-hidden="true" 追加
 *   - 未読 dot span から role="img" + aria-label="未読" を削除 (visual only に)
 *
 * 検証: source-side regex assert + iter735/883/884/885 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  const pAriaHidden = /<p className="text-xs leading-snug" aria-hidden="true">/.test(nb)
  // 未読 dot span は visual only (role/aria-label 削除済)
  const unreadDotPlain =
    /<span\s+className="bg-primary mr-1 inline-block h-1\.5 w-1\.5 shrink-0 rounded-full align-middle"\s*\/>/.test(
      nb,
    )
  if (pAriaHidden && unreadDotPlain) {
    findings.push({
      level: 'info',
      message: `iter886: notification-item <p> aria-hidden + 未読 dot visual-only OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter886: 不完全 (p=${pAriaHidden} dot=${unreadDotPlain})`,
    })
  }

  // iter885 invariant: assignee-picker label aria-hidden 維持
  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  if ((ap.match(/<span aria-hidden="true">\{label\}<\/span>/g) ?? []).length >= 2) {
    findings.push({
      level: 'info',
      message: `iter885 invariant: assignee-picker label aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter885 invariant: 破壊` })
  }

  // iter884 invariant: tag-picker name aria-hidden 維持
  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')
  if (/<span aria-hidden="true">\{t\.name\}<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `iter884 invariant: tag-picker name aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter884 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter886) ===`)
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
