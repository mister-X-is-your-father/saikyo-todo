/**
 * Phase 6.15 loop iter 763 (mode-D Desktop a11y) —
 * workspace-header の <header> banner landmark に動的 aria-label を追加
 * (iter750-762 region/landmark sweep の最終 cleanup、page-specific naming)。
 *
 * 課題: workspace-header.tsx 行 20 の `<header>` は implicit banner landmark を持つが
 *   aria-label が無く、SR ユーザは複数 page を navigate する時 banner が page-specific
 *   に区別されない。`Workspace header: ${title}` で title 込みの page-specific naming に
 *   する。
 *
 * fix (1 ファイル ~5 行差分):
 *   - <header> に `aria-label={`Workspace header: ${title}`}` 追加
 *
 * 検証: source-side regex assert + iter727-762 invariant cross-check。
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

  // 1. workspace-header banner 動的 aria-label
  const hasBanner =
    /<header\s*\n\s*className="[^"]*"\s*\n\s*aria-label=\{`Workspace header: \$\{title\}`\}/.test(
      wh,
    )

  if (hasBanner) {
    findings.push({ level: 'info', message: `workspace-header banner 動的 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `workspace-header banner aria-label 欠落` })
  }

  // 2. iter762 invariant: notification-preferences button 動的 aria-label 維持
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
      message: `iter762 invariant: notification-preferences 動的 aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter762 invariant: 破壊` })
  }

  // 3. iter761 invariant: Sprint progressbar 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Sprint「\$\{sprint\.name\}」完了率 \$\{pct\}% \(\$\{done\}\/\$\{total\} 件、\$\{sprintProgressToneLabel\(tone\)\}\)`\}/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `iter761 invariant: Sprint progressbar 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter761 invariant: 破壊` })
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

  console.log(`\n=== Findings (workspace-header-banner-iter763) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
