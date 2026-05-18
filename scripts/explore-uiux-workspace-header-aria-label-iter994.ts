/**
 * Phase 6.15 loop iter 994 — workspace-header.tsx の <header> aria-label の
 * "Workspace header: ${title}" → "Workspace: ${title}" に変更、" header" suffix 削除
 * (iter945 sweep を WorkspaceHeader にも展開、element tag 名 redundant 排除)。
 *
 * 課題: <header> element は実装上 implicit banner landmark / generic として SR が "header"
 *   や "banner" を補完 announce する文脈で aria-label に "header" word が含まれていると
 *   SR Verbose mode で同 word 二重 announce のリスク。iter945 で app/page.tsx HomePage に
 *   同じ修正を適用したが、WorkspaceHeader (workspace 配下 8 page で使用) は手付かずだった。
 *
 * fix: workspace-header.tsx の aria-label を "Workspace header: ${title}" → "Workspace: ${title}"。
 *   +0/-7 文字 (1 file, 1 行 net)。視覚 / DOM / 動作不変。SR landmark name は
 *   "Workspace: ${title}" で workspace 文脈 + page-specific title を保持。8 page で一括反映。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル 1 行 (+ comment 1 行)。
 *
 * 検証: source-side regex で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/workspace/workspace-header.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 修正後値
  if (!/aria-label={`Workspace: \${title}`}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: aria-label "Workspace: \${title}" 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `workspace-header aria-label OK` })
  }

  // " header" suffix 残存 0 (regression 検出)
  if (/aria-label={`Workspace header: \${title}`}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: redundant "Workspace header:" 残存 (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: `redundant "header" suffix 削除 OK` })
  }

  // iter945 invariant: app/page.tsx home header
  const homeSrc = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  if (!/aria-label="最強TODO ホーム"/.test(homeSrc)) {
    findings.push({ level: 'warning', message: `iter945 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter945 invariant OK` })
  }

  // iter986 invariant: sprints back-Link
  const sprintsSrc = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/sprints/page.tsx'),
    'utf8',
  )
  if (!/aria-label="Workspace dashboard に戻る"/.test(sprintsSrc)) {
    findings.push({ level: 'warning', message: `iter986 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter986 invariant OK` })
  }

  console.log(`\n=== Findings (workspace-header-aria-label-iter994) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.some((f) => f.level !== 'info') ? 1 : 0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
