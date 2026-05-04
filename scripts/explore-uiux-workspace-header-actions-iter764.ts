/**
 * Phase 6.15 loop iter 764 (mode-D Desktop a11y) —
 * workspace-header の actions group の aria-label に title を含めて page-specific 化
 * (iter763 banner naming に揃える、SR の重複 group 解消)。
 *
 * 課題: workspace-header.tsx 行 42 の `aria-label="ヘッダー操作 (ページ固有アクション /
 *   ユーティリティ)"` は静的で、複数 page の navigate 時 group が同名で重複する。
 *   iter763 で banner に title を入れたのと整合させる。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label を `「${title}」 ヘッダー操作 (ページ固有アクション / ユーティリティ)` に動的化
 *
 * 検証: source-side regex assert + iter727-763 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wh = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-header.tsx'),
    'utf8',
  )

  // 1. workspace-header actions group 動的 aria-label
  const hasDynamicLabel =
    /aria-label=\{`「\$\{title\}」 ヘッダー操作 \(ページ固有アクション \/ ユーティリティ\)`\}/.test(
      wh,
    )

  if (hasDynamicLabel) {
    findings.push({
      level: 'info',
      message: `workspace-header actions group 動的 aria-label OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workspace-header actions group 動的 aria-label 欠落`,
    })
  }

  // 2. iter763 invariant: workspace-header banner 維持 (同 file 別箇所)
  if (
    /<header\s*\n\s*className="[^"]*"\s*\n\s*aria-label=\{`Workspace header: \$\{title\}`\}/.test(
      wh,
    )
  ) {
    findings.push({ level: 'info', message: `iter763 invariant: workspace-header banner 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter763 invariant: 破壊` })
  }

  // 3. iter762 invariant: notification-preferences 動的 aria-label 維持
  const np = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-preferences.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{\s*\n?\s*onCount !== null\s*\n?\s*\? `通知設定 \(メール通知 \$\{onCount\}\/\$\{TOGGLES\.length\} 種 ON\)`/.test(
      np,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter762 invariant: notification-preferences 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter762 invariant: 破壊` })
  }

  // 4. iter757 invariant: KR progressbar 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`KR「\$\{kr\.title\}」進捗 \$\{pct\}%`\}/.test(gp)) {
    findings.push({ level: 'info', message: `iter757 invariant: KR progressbar 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter757 invariant: 破壊` })
  }

  // 5. iter755 race invariant: data-widget-card region 維持
  const dwc = readFileSync(
    resolve(process.cwd(), 'src/components/shared/data-widget-card.tsx'),
    'utf8',
  )
  if (/aria-label=\{count !== undefined \? `\$\{title\} \(\$\{count\} 件\)` : title\}/.test(dwc)) {
    findings.push({
      level: 'info',
      message: `iter755 race invariant: DataWidgetCard region 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter755 race invariant: 破壊` })
  }

  console.log(`\n=== Findings (workspace-header-actions-iter764) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
