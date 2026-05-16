/**
 * Phase 6.15 loop iter 870 (mode-D Desktop a11y) —
 * workspace page top nav 「← 一覧」 Link visible text を aria-hidden span で
 * 1 つにまとめる (Workspace 一覧へ戻る Link)。
 *
 * 課題: src/app/(workspace)/[workspaceId]/page.tsx の Workspace top nav 内の
 *   「← 一覧」 Link は aria-label="Workspace 一覧へ戻る" が完全 content を
 *   含むのに、visible は 「<span aria-hidden="true">← </span>一覧」 で 「一覧」
 *   text 部分が aria-hidden 無し → SR ユーザは aria-label「Workspace 一覧へ戻る」
 *   を聞いた後、visible「一覧」 も別途読み上げされる重複。
 *   iter800-869 sweep の続編、Workspace top nav 最後の a11y gap。
 *
 * fix (1 file ~1 spot):
 *   - 「<span aria-hidden="true">← </span>一覧」 を 「<span aria-hidden="true">
 *     ← 一覧</span>」 に統合 (2 spans → 1 span aria-hidden)
 *   - aria-label 単独経路に統一、機能不変、視覚 layout 不変、shadcn 編集なし
 *   - 既存 「← 」 アイコン部 + 「一覧」 text を 1 aria-hidden span にまとめる
 *
 * 検証: source-side regex assert + iter735/869 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wp = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">← 一覧<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `Workspace top nav 「← 一覧」 1 span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `Workspace top nav 「← 一覧」 1 span aria-hidden 未統合`,
    })
  }
  if (/aria-label="Workspace 一覧へ戻る"/.test(wp)) {
    findings.push({ level: 'info', message: `Workspace top nav aria-label 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `Workspace top nav aria-label 破壊` })
  }
  // 旧 pattern (split into 2 spans) は消えたか
  if (!/<span aria-hidden="true">← <\/span>一覧/.test(wp)) {
    findings.push({
      level: 'info',
      message: `旧 split 2 span pattern が消えていることを確認 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `旧 split 2 span pattern が残存 (regression)`,
    })
  }

  // iter869 invariant: goals-panel KR add aria-hidden
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">KR 追加<\/span>/.test(gp)) {
    findings.push({
      level: 'info',
      message: `iter869 invariant: goals-panel KR add aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter869 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (workspace-back-nav-aria-hidden-iter870) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
