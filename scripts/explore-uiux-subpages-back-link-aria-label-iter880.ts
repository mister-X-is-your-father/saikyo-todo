/**
 * Phase 6.15 loop iter 880 (mode-D Desktop a11y / WCAG 2.4.4 一貫 navigation 統一) —
 * 8 subpage の Workspace 戻る Link に aria-label "Workspace ホームへ戻る" を追加 + visible 統一 wrap。
 *
 * 課題: 8 subpage (sprints / goals / pdca / workflows / time-entries / templates / integrations / archive)
 *   の Workspace 戻る Link は visible "← Workspace" のうち "← " のみ aria-hidden で
 *   "Workspace" 単体が SR 名。文脈なし「Workspace」は SR 利用時に「どこへ移動?」が不明瞭。
 *   workspace ホーム側 (iter879) では aria-label "Workspace 一覧へ戻る" + 1 span aria-hidden の
 *   統一 pattern を採用済み、subpage 側だけ未統一だった。
 *
 * fix (8 ファイル各 1 ブロック差分):
 *   - 各 Link に aria-label="Workspace ホームへ戻る" を追加
 *   - visible "← Workspace" を 1 span aria-hidden で wrap (aria-label 単独経路に統一)
 *
 * 検証: 8 ファイル regex assert + iter879 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const SUBPAGES = [
  'src/app/(workspace)/[workspaceId]/sprints/page.tsx',
  'src/app/(workspace)/[workspaceId]/goals/page.tsx',
  'src/app/(workspace)/[workspaceId]/pdca/page.tsx',
  'src/app/(workspace)/[workspaceId]/workflows/page.tsx',
  'src/app/(workspace)/[workspaceId]/time-entries/page.tsx',
  'src/app/(workspace)/[workspaceId]/templates/page.tsx',
  'src/app/(workspace)/[workspaceId]/integrations/page.tsx',
  'src/app/(workspace)/[workspaceId]/archive/page.tsx',
]

async function main(): Promise<void> {
  const findings: Finding[] = []

  for (const path of SUBPAGES) {
    const text = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (
      /aria-label="Workspace ホームへ戻る"/.test(text) &&
      /<span aria-hidden="true">← Workspace<\/span>/.test(text)
    ) {
      findings.push({
        level: 'info',
        message: `${path.split('/').slice(-2).join('/')} aria-label + visible 1 span aria-hidden OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `${path.split('/').slice(-2).join('/')} 未統一`,
      })
    }
  }

  // iter879 invariant
  const wp = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">← 一覧<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter879 invariant: workspace page nav 「← 一覧」 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter879 invariant: 破壊` })
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

  console.log(`\n=== Findings (subpages-back-link-aria-label-iter880) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
