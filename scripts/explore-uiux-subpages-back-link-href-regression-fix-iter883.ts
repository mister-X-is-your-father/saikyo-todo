/**
 * Phase 6.15 loop iter 883 (regression fix / iter880 bug) —
 * iter880 perl batch substitution が `${workspaceId}` 補間を破壊し、Workspace 戻る Link の
 * href が `/${workspaceId}` (workspace home) から `/` (workspace list root) に regress した
 * のを修正。functional regression なので最優先。
 *
 * 課題: iter880 で 8 subpage に aria-label 追加した時、perl の `${workspaceId}` がシェル展開で
 *   空文字列になり、`<Link href={``}` (空) → 最終的に `<Link href={`/`}>` に固定化された。
 *   結果: subpage 「Workspace」 戻る button が workspace home でなく workspace list root に飛ぶ
 *   (functional bug)。aria-label 「Workspace ホームへ戻る」 と動作が不一致 (WCAG 2.5.3 違反かつ
 *   navigation 期待値破壊)。
 *
 * fix: 8 subpage の href を `/${workspaceId}` に復元 (Edit ツールで file 個別)。
 *
 * 検証: 8 ファイル regex assert + iter880 invariant (aria-label / visible wrap) cross-check。
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
    // href の正しい復元: `/${workspaceId}` を補間する template literal
    if (/<Link href=\{`\/\$\{workspaceId\}`\} aria-label="Workspace ホームへ戻る"/.test(text)) {
      findings.push({
        level: 'info',
        message: `${path.split('/').slice(-2).join('/')} href \`/\${workspaceId}\` 復元 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `${path.split('/').slice(-2).join('/')} href 復元 未完`,
      })
    }
    // 退化 pattern `/` 単独が残っていないこと
    if (/<Link href=\{`\/`\} aria-label="Workspace ホームへ戻る"/.test(text)) {
      findings.push({
        level: 'warning',
        message: `${path.split('/').slice(-2).join('/')} href \`/\` regression 残存`,
      })
    }
    // iter880 invariant: aria-label + visible 1 span aria-hidden
    if (/<span aria-hidden="true">← Workspace<\/span>/.test(text)) {
      findings.push({
        level: 'info',
        message: `${path.split('/').slice(-2).join('/')} iter880 invariant 維持 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `${path.split('/').slice(-2).join('/')} iter880 invariant 破壊`,
      })
    }
  }

  // iter879 invariant: workspace home page back-link
  const wp = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">← 一覧<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter879 invariant: workspace page 「← 一覧」 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter879 invariant: 破壊` })
  }

  console.log(`\n=== Findings (subpages-back-link-href-regression-fix-iter883) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
