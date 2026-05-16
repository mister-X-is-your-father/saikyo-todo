/**
 * Phase 6.15 loop iter 870 (mode-D Desktop a11y) —
 * src/app/(workspace)/[workspaceId]/page.tsx の workspace 内 nav「一覧」 Link
 * visible "← 一覧" を一つの <span aria-hidden="true"> で wrap 統合し、
 * aria-label 単独経路に統一。
 *
 * 経緯: iter844-869 sweep の続編。Workspace 内 nav の最後にある 「一覧」 Link は
 *   aria-label "Workspace 一覧へ戻る" 完全 content を含むが、visible が
 *   "← " (aria-hidden 済) + "一覧" (aria-hidden 無し) の 2 部構成で「一覧」だけ
 *   素読みされる → SR は aria-label と「一覧」が二重に読まれる重複。
 *   iter830 home page Workspace Link の outer div aria-hidden 統合と同 pattern。
 *
 * 修正: arrow + visible text を 1 <span aria-hidden="true"> に統合、
 *   aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-869 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wsHome = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )

  // 1. 「一覧」 Link visible 統合 aria-hidden
  if (/<span aria-hidden="true">← 一覧<\/span>/.test(wsHome)) {
    findings.push({
      level: 'info',
      message: `workspace home 一覧 Link visible "← 一覧" 1 span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workspace home 一覧 Link visible aria-hidden 統合 未統合`,
    })
  }

  // 2. aria-label 維持
  if (/aria-label="Workspace 一覧へ戻る"/.test(wsHome)) {
    findings.push({
      level: 'info',
      message: `workspace home 一覧 Link aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workspace home 一覧 Link aria-label 破壊`,
    })
  }

  // 3. nav 構造 + 他 ws 内 link 維持
  if (
    /aria-label="ワークスペース内ナビゲーション"/.test(wsHome) &&
    /\/goals/.test(wsHome) &&
    /\/sprints/.test(wsHome) &&
    /\/archive/.test(wsHome)
  ) {
    findings.push({
      level: 'info',
      message: `workspace home nav 構造 + 他 link 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workspace home nav 構造 破壊`,
    })
  }

  // iter869 invariant: sprints-panel 3 button aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">編集<\/span>/.test(sp) &&
    /<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter869 invariant: sprints-panel 残 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter869 invariant: 破壊` })
  }

  // iter867 invariant: home page logout
  const home = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  if (/<span aria-hidden="true">ログアウト<\/span>/.test(home)) {
    findings.push({
      level: 'info',
      message: `iter867 invariant: home page logout aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter867 invariant: 破壊` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (workspace-home-list-link-aria-hidden-iter870) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
