/**
 * Phase 6.15 loop iter 914 (mode-D Desktop a11y) —
 * integrations-panel SourceImportHistory row 内 2 span (fetched/created/updated
 * 数値統計 + Pull エラー) の visible text を aria-hidden 化、parent span の aria-label
 * 単独 SR 経路に統一 (iter900/902/904 と同 pattern を integration view に展開)。
 *
 * 経緯: parent span aria-label "fetched X / created Y / updated Z" が SR 完全 content
 *   を持つにも関わらず、visible 文字列 "f=X / c=Y / u=Z" は aria-hidden 無し → SR が
 *   2 形式で同 数値を二重読み (= cognitive load 倍 + 形式差で混乱)。同 row 内エラー
 *   span も aria-label "Pull エラー: {error}" + 内側 visible {error} 同 pattern。
 *
 * 修正 (+4/-2 行、1 file):
 *   - 統計 span 内側 visible "f=X / c=Y / u=Z" を <span aria-hidden="true"> で wrap
 *   - エラー span 内側 visible {r.error} を <span aria-hidden="true"> で wrap
 *   - parent span aria-label / role="alert" / title= は維持 (mouse hover / SR / a11y tree)
 *
 * 検証: source-side regex assert + iter735/913 invariant cross-check。
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

  // 1. 統計 span 内側 aria-hidden 追加 OK
  if (
    /<span aria-hidden="true">\s*f=\{r\.fetchedCount\} \/ c=\{r\.createdCount\} \/ u=\{r\.updatedCount\}\s*<\/span>/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `integrations-panel 統計 span 内側 aria-hidden 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `integrations-panel 統計 span 内側 aria-hidden 欠落`,
    })
  }

  // 2. parent 統計 span aria-label 維持
  if (
    /aria-label=\{`fetched \$\{r\.fetchedCount\} \/ created \$\{r\.createdCount\} \/ updated \$\{r\.updatedCount\}`\}/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `integrations-panel parent 統計 span aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `integrations-panel parent 統計 span aria-label 破壊`,
    })
  }

  // 3. エラー span 内側 aria-hidden 追加 OK
  if (/<span aria-hidden="true">\{r\.error\}<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `integrations-panel エラー span 内側 aria-hidden 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `integrations-panel エラー span 内側 aria-hidden 欠落`,
    })
  }

  // 4. parent エラー span aria-label + role="alert" + title 維持
  if (
    /aria-label=\{`Pull エラー: \$\{r\.error\}`\}/.test(ip) &&
    /role="alert"/.test(ip) &&
    /title=\{r\.error\}/.test(ip)
  ) {
    findings.push({
      level: 'info',
      message: `integrations-panel parent エラー span aria-label / role / title 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `integrations-panel parent エラー span 属性破壊`,
    })
  }

  // 5. ul aria-label 維持
  if (/aria-label=\{`直近の Pull 履歴 \$\{imports\.length\} 件 \(最新順\)`\}/.test(ip)) {
    findings.push({
      level: 'info',
      message: `integrations-panel ul aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `integrations-panel ul aria-label 破壊`,
    })
  }

  // iter913 invariant: gantt baseline chip 3-chip 一貫
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /aria-label=\{`baseline \$\{baselineCount\} 件 \(計画策定時に固定した開始\/終了日、実績との遅延差分計測の基準\)`\}/.test(
      gv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter913 invariant: gantt baseline chip aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter913 invariant: 破壊` })
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

  console.log(`\n=== Findings (integrations-import-row-aria-iter914) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
