/**
 * Phase 6.15 loop iter 882 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * integrations-panel.tsx の EmptyState「作成フォームへ」 raw button visible を aria-hidden span に統合。
 *
 * 課題: src/components/integrations/integrations-panel.tsx line 70 raw button は
 *   visible "作成フォームへ" 直接 children だが aria-label "Source 作成フォームの『名前』入力欄にフォーカス"
 *   完全 content 包含 → SR 再 announce、EmptyState focus jump pattern (templates / workflows / time-entries / goals / sprints と統一)。
 *
 * fix (1 ファイル 1 行差分):
 *   - <span aria-hidden="true">作成フォームへ</span> で wrap
 *
 * 検証: source-side regex assert + iter881/880/879/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  // 作成フォームへ aria-hidden span は EmptyState 用 1 件あるはず
  const formCount = (ip.match(/<span aria-hidden="true">作成フォームへ<\/span>/g) ?? []).length
  if (formCount === 1) {
    findings.push({
      level: 'info',
      message: `integrations-panel 「作成フォームへ」 EmptyState aria-hidden 統合 OK (1 件)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `integrations-panel 「作成フォームへ」 件数 ${formCount} (期待 1)`,
    })
  }

  // iter881 invariant
  const mt = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">ログアウト<\/span>/.test(mt)) {
    findings.push({
      level: 'info',
      message: `iter881 invariant: mock-top-nav ログアウト 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter881 invariant: 破壊` })
  }

  // iter861 invariant: integrations-panel 既存 source ops
  if (
    /<span aria-hidden="true">\{trigger\.isPending \? 'Pull 中…' : 'Pull'\}<\/span>/.test(ip) &&
    /<span aria-hidden="true">履歴<\/span>/.test(ip)
  ) {
    findings.push({
      level: 'info',
      message: `iter861 invariant: integrations-panel Source ops 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter861 invariant: 破壊` })
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

  console.log(`\n=== Findings (integrations-empty-state-aria-hidden-iter882) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
