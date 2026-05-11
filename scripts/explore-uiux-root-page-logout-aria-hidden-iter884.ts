/**
 * Phase 6.15 loop iter 884 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * root page (/) の「ログアウト」 Button visible を aria-hidden span に統合。
 *
 * 課題: src/app/page.tsx line 45 「ログアウト」 Button は visible 直接 children だが
 *   aria-label "ログアウトしてログイン画面に戻る" 完全 content 包含 → SR 再 announce、
 *   workspace 一覧 (ホーム) からの logout path 頻繁。
 *
 * fix (1 ファイル 1 行差分):
 *   - <span aria-hidden="true">ログアウト</span> で wrap
 *
 * 検証: source-side regex assert + iter883/882/881/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const rp = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  if (/<span aria-hidden="true">ログアウト<\/span>/.test(rp)) {
    findings.push({
      level: 'info',
      message: `root page ログアウト Button aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `root page ログアウト 未統合` })
  }

  // iter883 invariant: subpages href 復元
  const sp = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/sprints/page.tsx'),
    'utf8',
  )
  if (/<Link href=\{`\/\$\{workspaceId\}`\} aria-label="Workspace ホームへ戻る"/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter883 invariant: subpages href 復元 維持 OK (sprints sample)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter883 invariant: 破壊` })
  }

  // iter882 invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter882 invariant: integrations-panel 作成フォームへ 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter882 invariant: 破壊` })
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

  console.log(`\n=== Findings (root-page-logout-aria-hidden-iter884) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
