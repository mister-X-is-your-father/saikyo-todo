/**
 * Phase 6.15 loop iter 548 (mode-D Desktop a11y) —
 * SprintsPanel sprint period 編集 + sprint defaults 編集 form の cancel Button に
 * aria-label + data-testid を補完。
 *
 * 課題: sprints-panel.tsx 行 609-621 (sprint period edit) + 行 912-924 (sprint defaults edit) の
 *   cancel Button 2 件は visible text "キャンセル" のみで aria-label / data-testid 不在。
 *   sprint period は複数 Sprint 並列で編集可能、sprint defaults は global だが SR は
 *   「キャンセル ボタン」だけで context が伝わらない。
 *
 * fix (1 ファイル ~4 行差分):
 *   - sprint period cancel: aria-label={`Sprint「${sprint.name}」の期間編集をキャンセル`}
 *     + data-testid={`sprint-period-cancel-${sprint.id}`}
 *   - sprint defaults cancel: aria-label="Sprint デフォルトの編集をキャンセル"
 *     + data-testid="sprint-defaults-cancel"
 *
 * iter543/544/545/546/547 pattern を SprintsPanel cancel button 2 件に展開、7 form 統一達成。
 *
 * 検証: source-side regex assert + iter515-547 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. sprint-period-cancel aria-label + data-testid
  if (
    /data-testid=\{`sprint-period-cancel-\$\{sprint\.id\}`\}\s+aria-label=\{`Sprint「\$\{sprint\.name\}」の期間編集をキャンセル`\}/.test(
      sp,
    ) ||
    /aria-label=\{`Sprint「\$\{sprint\.name\}」の期間編集をキャンセル`\}\s+data-testid=\{`sprint-period-cancel-\$\{sprint\.id\}`\}/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel.tsx: sprint-period-cancel aria-label + data-testid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel.tsx: sprint-period-cancel aria-label / data-testid 不在`,
    })
  }

  // 2. sprint-defaults-cancel aria-label + data-testid
  if (
    /data-testid="sprint-defaults-cancel"\s+aria-label="Sprint デフォルトの編集をキャンセル"/.test(
      sp,
    ) ||
    /aria-label="Sprint デフォルトの編集をキャンセル"\s+data-testid="sprint-defaults-cancel"/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprints-panel.tsx: sprint-defaults-cancel aria-label + data-testid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel.tsx: sprint-defaults-cancel aria-label / data-testid 不在`,
    })
  }

  // 3. iter547 invariant: comment-edit-cancel aria-label 維持
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (
    /data-testid=\{`comment-edit-cancel-\$\{comment\.id\}`\}/.test(ct) &&
    /aria-label="コメントの編集をキャンセル"/.test(ct)
  ) {
    findings.push({
      level: 'info',
      message: `iter547 invariant: comment-edit-cancel aria 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter547 invariant: 破壊`,
    })
  }

  // 4. iter515 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (sprint-cancel-aria-iter548) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
