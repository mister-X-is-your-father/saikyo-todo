/**
 * Phase 6.15 loop iter 995 — <nav> aria-label の "ナビゲーション" suffix sweep
 * (iter945/994 element tag 名 redundant 排除 pattern を <nav> にも展開、2 file)。
 *
 * 課題: 2 <nav> aria-label で "ナビゲーション" word を suffix 含み (mock-top-nav /
 *   workspace dashboard sub-page Link nav)。<nav> 自体が SR が "navigation" landmark
 *   として announce する文脈で、aria-label の "ナビゲーション" は同 word 二重 announce
 *   リスク + verbose。代わりに具体的な item リストを括弧で示すことで context-rich + 簡潔化。
 *
 * fix:
 *   1. mock-top-nav.tsx: "mock-timesheet ナビゲーション" → "mock-timesheet (新規入力 / 入力一覧 / ログアウト)"
 *   2. workspace dashboard page.tsx: "ワークスペース内ナビゲーション" → "ワークスペース内 (Goals / Sprints / PDCA / Templates / Workflows / API / Time / Archive)"
 *   +2/-2 行 (2 file)。視覚 / DOM / 動作不変。SR は navigation landmark + 具体 item list
 *   で context-rich に取得。
 *
 * 機能追加なし、shadcn 編集なし、影響面 2 ファイル。
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

  const mockNav = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )
  if (!/aria-label="mock-timesheet \(新規入力 \/ 入力一覧 \/ ログアウト\)"/.test(mockNav)) {
    findings.push({ level: 'warning', message: `mock-top-nav: 新 aria-label 不在` })
  } else {
    findings.push({ level: 'info', message: `mock-top-nav aria-label OK` })
  }
  if (/aria-label="mock-timesheet ナビゲーション"/.test(mockNav)) {
    findings.push({ level: 'warning', message: `mock-top-nav: redundant "ナビゲーション" 残存` })
  } else {
    findings.push({ level: 'info', message: `mock-top-nav redundant 削除 OK` })
  }

  const wsPage = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (
    !/aria-label="ワークスペース内 \(Goals \/ Sprints \/ PDCA \/ Templates \/ Workflows \/ API \/ Time \/ Archive\)"/.test(
      wsPage,
    )
  ) {
    findings.push({ level: 'warning', message: `workspace dashboard: 新 aria-label 不在` })
  } else {
    findings.push({ level: 'info', message: `workspace dashboard aria-label OK` })
  }
  if (/aria-label="ワークスペース内ナビゲーション"/.test(wsPage)) {
    findings.push({
      level: 'warning',
      message: `workspace dashboard: redundant "ナビゲーション" 残存`,
    })
  } else {
    findings.push({ level: 'info', message: `workspace dashboard redundant 削除 OK` })
  }

  // iter994 invariant
  const wsHeaderSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-header.tsx'),
    'utf8',
  )
  if (!/aria-label={`Workspace: \${title}`}/.test(wsHeaderSrc)) {
    findings.push({ level: 'warning', message: `iter994 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter994 invariant OK` })
  }

  console.log(`\n=== Findings (nav-aria-label-suffix-iter995) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.some((f) => f.level !== 'info') ? 1 : 0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
