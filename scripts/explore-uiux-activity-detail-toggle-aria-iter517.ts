/**
 * Phase 6.15 loop iter 517 (mode-D Desktop a11y) —
 * ActivityLog ActivityRow 「詳細を見る/閉じる」 toggle button に aria-label を付与
 * (iter515-516 disclosure aria-label pattern 水平展開、累計 3 件統一)。
 *
 * 課題: activity-log.tsx 行 185-197 の差分 disclosure button が aria-expanded /
 *   aria-controls はあるが aria-label が無い。Activity 行が複数並ぶと SR ユーザは
 *   Tab で渡る時にどの操作の詳細を開閉する button か区別できない (button 名が全て
 *   「詳細を見る/閉じる」で同一)。
 *
 * fix (1 ファイル ~7 行差分):
 *   - aria-label を `「${label}」の差分 (before / after) を見る/閉じる` 形式で
 *     動的に付与 (open/close + 操作種別ラベルで識別性確保)。
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、aria-expanded / aria-controls /
 * data-testid 維持、iter507 pseudo tap target invariant 維持。
 *
 * 検証: source-side regex assert + iter515-516 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )

  // 1. 詳細 toggle button に aria-label が動的に付与されているか
  if (
    /aria-label=\{\s*open\s*\?\s*`「\$\{label\}」の差分 \(before \/ after\) を閉じる`\s*:\s*`「\$\{label\}」の差分 \(before \/ after\) を見る`\s*\}/.test(
      al,
    )
  ) {
    findings.push({
      level: 'info',
      message: `activity-log.tsx: 詳細 toggle button aria-label (open/close + label で動的) 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `activity-log.tsx: 詳細 toggle button aria-label 配線 不在`,
    })
  }

  // 2. 既存 aria 属性 (aria-expanded / aria-controls / data-testid) が壊れていないか
  if (
    /aria-expanded=\{open\}/.test(al) &&
    /aria-controls=\{detailId\}/.test(al) &&
    /data-testid=\{`activity-detail-toggle-\$\{entry\.id\}`\}/.test(al)
  ) {
    findings.push({
      level: 'info',
      message: `activity-log.tsx: 詳細 toggle 既存 aria-expanded / aria-controls / data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `activity-log.tsx: 詳細 toggle 既存 aria 属性 / data-testid 破壊`,
    })
  }

  // 3. iter507 invariant: pseudo tap target (before:-inset-3) 維持
  if (/before:absolute before:-inset-3 before:content-\[''\]/.test(al)) {
    findings.push({
      level: 'info',
      message: `iter507 invariant: activity-log pseudo tap target 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter507 invariant: pseudo tap target 破壊` })
  }

  // 4. iter515 invariant: integrations-panel 履歴 toggle aria-label 維持
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴 \(直近 5 件\) を閉じる`/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 履歴 toggle aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter515 invariant: 破壊` })
  }

  // 5. iter516 invariant: workflows-panel 履歴 toggle aria-label 維持
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{\s*runsOpen\s*\?\s*`Workflow「\$\{wf\.name\}」の実行履歴 \(直近 5 件\) を閉じる`/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter516 invariant: workflows-panel 履歴 toggle aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter516 invariant: 破壊` })
  }

  console.log(`\n=== Findings (activity-detail-toggle-aria-iter517) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
