/**
 * Phase 6.15 loop iter 871 (mode-D Desktop a11y) —
 * sprints-panel 期間編集 form 2 button (cancel / save):
 * WCAG 2.5.3 (Label in Name) prefix 適合 + visible aria-hidden 統一。
 *
 * 課題: src/components/workspace/sprints-panel.tsx の 期間編集 form:
 *   - sprint-period-cancel-{id}: visible "キャンセル" NOT aria-hidden + aria-label
 *     「Sprint「N」の期間編集をキャンセル」 suffix substring (prefix 不一致)
 *   - sprint-period-save-{id}: visible "保存" / "保存中…" NOT aria-hidden + aria-label
 *     「Sprint「N」の期間を保存…」 suffix substring (prefix 不一致)
 *   iter844-870 で同 pattern 順次適合化済。SprintsPanel 内 status 遷移 / AI button
 *   は適合化済 (iter854-856) だが 期間編集 form の 2 button が残る。
 *
 * fix (1 ファイル、2 button 一括 ~4 行差分):
 *   - 各 aria-label を visible text prefix 形に変更:
 *     - キャンセル → 「キャンセル (Sprint「N」の期間編集をキャンセル)」
 *     - 保存 / 保存中… → 「保存 (Sprint「N」の期間を保存)」 / 「保存中… (Sprint「N」の期間
 *       を保存中)」
 *   - 2 button の visible を <span aria-hidden="true"> で wrap、aria-label 単独経路に
 *     統一 (iter844-870 と一貫)。
 *
 * 検証: source-side regex assert + iter862/865/866/869/870 invariant cross-check。
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

  // 1. sprint-period-cancel aria-label prefix + aria-hidden
  if (
    /aria-label=\{`キャンセル \(Sprint「\$\{sprint\.name\}」の期間編集をキャンセル\)`\}/.test(sp) &&
    /data-testid=\{`sprint-period-cancel-\$\{sprint\.id\}`\}[\s\S]+?<span aria-hidden="true">キャンセル<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-period-cancel aria-label visible "キャンセル" prefix + aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-period-cancel NG` })
  }

  // 2. sprint-period-save aria-label prefix (通常 + pending) + aria-hidden
  if (
    /aria-label=\{[\s\S]+?`保存 \(Sprint「\$\{sprint\.name\}」の期間を保存\)`/.test(sp) &&
    /aria-label=\{[\s\S]+?`保存中… \(Sprint「\$\{sprint\.name\}」の期間を保存中\)`/.test(sp) &&
    /data-testid=\{`sprint-period-save-\$\{sprint\.id\}`\}[\s\S]+?<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-period-save aria-label visible "保存" prefix (通常 + pending) + aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-period-save NG` })
  }

  // 3. data-testid 維持
  if (
    /data-testid=\{`sprint-period-cancel-\$\{sprint\.id\}`\}/.test(sp) &&
    /data-testid=\{`sprint-period-save-\$\{sprint\.id\}`\}/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `sprint period edit form 2 button data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint period edit form 2 button data-testid 破壊`,
    })
  }

  // iter870 invariant: proposal edit form save
  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{[\s\S]+?`保存 \(提案「\$\{proposal\.title\}」の編集を保存、Cmd\/Ctrl\+Enter でも可\)`/.test(
      dp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter870 invariant: proposal-save aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter870 invariant: 破壊` })
  }

  // iter856 invariant: sprint status
  if (
    /<span aria-hidden="true">期間<\/span>/.test(sp) &&
    /<span aria-hidden="true">中止<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: sprint status button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: 破壊` })
  }

  // iter862 invariant: item-edit-save
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{[\s\S]+?`保存 \(「\$\{item\.title\}」を保存、Cmd\/Ctrl\+S でも可、楽観ロックで version が進む\)`/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter862 invariant: item-edit-save aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter862 invariant: 破壊` })
  }

  // iter850 invariant: bulk-delete
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">削除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete "削除" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: 破壊` })
  }

  console.log(`\n=== Findings (sprint-period-edit-form-label-in-name-iter871) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
