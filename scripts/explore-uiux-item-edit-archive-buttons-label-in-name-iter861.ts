/**
 * Phase 6.15 loop iter 861 (mode-D Desktop a11y) —
 * item-edit-dialog reload / archive / unarchive button 3 件:
 * WCAG 2.5.3 (Label in Name) 一括適合 + visible aria-hidden 統一。
 *
 * 課題: src/components/workspace/item-edit-dialog.tsx の 3 button:
 *   - item-edit-reload: visible "最新を読み込み" (aria-hidden 維持済み iter843) vs
 *     旧 aria-label "自分の編集内容を破棄してサーバの最新値を読み込み直す" → "最新を
 *     読み込み" が name prefix では無く voice user 発話と不一致 (substring "最新" /
 *     "読み込み" は別位置)
 *   - item-edit-unarchive: visible "アーカイブ復元" / "復元中…" NOT aria-hidden +
 *     aria-label "「N」をアーカイブから復元/復元中…" 内 substring で prefix 不一致
 *   - item-edit-archive: visible "アーカイブ" / "アーカイブ中…" NOT aria-hidden +
 *     aria-label "「N」をアーカイブ/アーカイブ中…" 内 substring で prefix 不一致
 *   iter844-860 で同 pattern を順次適合化済、item-edit-dialog 内 button が残る。
 *
 * fix (1 ファイル、3 button 一括 ~8 行差分):
 *   - 各 aria-label を visible text prefix 形に変更:
 *     - 最新を読み込み → 「最新を読み込み (自分の編集内容を破棄してサーバの最新値を読み込み直す)」
 *     - アーカイブ復元 / 復元中… → 「アーカイブ復元 (「N」をアーカイブから復元)」 /
 *       「復元中… (「N」をアーカイブから復元)」
 *     - アーカイブ / アーカイブ中… → 「アーカイブ (「N」をアーカイブ、後で復元可能)」 /
 *       「アーカイブ中… (「N」)」
 *   - item-edit-unarchive / archive visible text を <span aria-hidden="true"> で wrap、
 *     aria-label 単独経路に統一 (iter844-860 と一貫)。item-edit-reload は元々
 *     aria-hidden 維持。
 *
 * 検証: source-side regex assert + iter850/856/857/858/859/860 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )

  // 1. item-edit-reload aria-label visible "最新を読み込み" prefix
  if (
    /aria-label="最新を読み込み \(自分の編集内容を破棄してサーバの最新値を読み込み直す\)"/.test(ied)
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-reload aria-label visible "最新を読み込み" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `item-edit-reload aria-label NG` })
  }
  // iter843 invariant: visible aria-hidden 維持
  if (/<span aria-hidden="true">最新を読み込み<\/span>/.test(ied)) {
    findings.push({
      level: 'info',
      message: `iter843 invariant: item-edit-reload visible "最新を読み込み" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter843 invariant: item-edit-reload aria-hidden 破壊`,
    })
  }

  // 2. item-edit-unarchive aria-label visible "アーカイブ復元" / "復元中…" prefix + aria-hidden
  if (
    /aria-label=\{[\s\S]+?`アーカイブ復元 \(「\$\{item\.title\}」をアーカイブから復元\)`/.test(
      ied,
    ) &&
    /aria-label=\{[\s\S]+?`復元中… \(「\$\{item\.title\}」をアーカイブから復元\)`/.test(ied)
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-unarchive aria-label visible "アーカイブ復元(中…)" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `item-edit-unarchive aria-label NG` })
  }
  if (
    /<span aria-hidden="true">[\s\S]+?unarchive\.isPending \? '復元中…' : 'アーカイブ復元'[\s\S]+?<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-unarchive visible span aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `item-edit-unarchive aria-hidden NG` })
  }

  // 3. item-edit-archive aria-label visible "アーカイブ" / "アーカイブ中…" prefix + aria-hidden
  if (
    /aria-label=\{[\s\S]+?`アーカイブ \(「\$\{item\.title\}」をアーカイブ、後で復元可能\)`/.test(
      ied,
    ) &&
    /aria-label=\{[\s\S]+?`アーカイブ中… \(「\$\{item\.title\}」\)`/.test(ied)
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-archive aria-label visible "アーカイブ(中…)" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `item-edit-archive aria-label NG` })
  }
  if (
    /<span aria-hidden="true">[\s\S]+?archive\.isPending \? 'アーカイブ中…' : 'アーカイブ'[\s\S]+?<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-archive visible span aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `item-edit-archive aria-hidden NG` })
  }

  // iter860 invariant: proposal accept/reject
  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{[\s\S]+?`採用 \(「\$\{proposal\.title\}」を採用して子タスクとして追加\)`/.test(dp)
  ) {
    findings.push({
      level: 'info',
      message: `iter860 invariant: proposal accept aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter860 invariant: 破壊` })
  }

  // iter858 invariant: integrations-panel
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">履歴<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: integrations-panel button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: 破壊` })
  }

  // iter856 invariant: sprint status
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">期間<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: sprint status button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: 破壊` })
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

  console.log(`\n=== Findings (item-edit-archive-buttons-label-in-name-iter861) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
