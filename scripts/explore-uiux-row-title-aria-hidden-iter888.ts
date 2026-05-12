/**
 * Phase 6.15 loop iter 888 (mode-D Desktop a11y) —
 * today-view / inbox-view / personal-period-view の 3 view で各 row title
 * 内 visible "{item.title}" を aria-hidden span で wrap (iter800-887 sweep の
 * 続編、view row title 完結 sweep、kanban-title (iter887) と対称化)。
 *
 * 課題: 3 view (today / inbox / personal-period) の row title は parent button /
 *   row に aria-label "「{title}」を編集" を持つのに、内側 visible "{title}"
 *   は aria-hidden 無し → SR で重複読み上げ可能性。各 view の主要 entry point
 *   (Item edit dialog open) で頻出。iter887 kanban-title と対称化、view 行
 *   完結 sweep。
 *
 * fix (3 ファイル ~3 行差分):
 *   - today-view button visible "{it.title}" → <span aria-hidden="true"> で wrap
 *   - inbox-view span (outer div clickable) に aria-hidden="true" 追加
 *   - personal-period-view button visible "{it.title}" → <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735/885/886/887 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  const todayOk =
    /data-testid=\{`today-title-\$\{it\.id\}`\}[\s\S]*?<span aria-hidden="true">\{it\.title\}<\/span>/.test(
      tv,
    )

  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  const inboxOk = /data-testid=\{`inbox-title-\$\{it\.id\}`\}\s+aria-hidden="true"/.test(iv)

  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  const ppvOk =
    /data-testid=\{`period-title-\$\{period\}-\$\{it\.id\}`\}[\s\S]*?<span aria-hidden="true">\{it\.title\}<\/span>/.test(
      ppv,
    )

  if (todayOk && inboxOk && ppvOk) {
    findings.push({
      level: 'info',
      message: `iter888: today + inbox + personal-period row title aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter888: 不完全 (today=${todayOk} inbox=${inboxOk} ppv=${ppvOk})`,
    })
  }

  // iter887 invariant: kanban-title aria-hidden 維持
  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(kv)) {
    findings.push({
      level: 'info',
      message: `iter887 invariant: kanban-title aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter887 invariant: 破壊` })
  }

  // iter886 invariant: notification-item aria-hidden 維持
  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (/<p className="text-xs leading-snug" aria-hidden="true">/.test(nb)) {
    findings.push({
      level: 'info',
      message: `iter886 invariant: notification-item aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter886 invariant: 破壊` })
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

  console.log(`\n=== Findings (iter888) ===`)
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
