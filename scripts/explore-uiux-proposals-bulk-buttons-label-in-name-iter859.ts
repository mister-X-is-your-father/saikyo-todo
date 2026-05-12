/**
 * Phase 6.15 loop iter 859 (mode-D Desktop a11y) —
 * decompose-proposals-panel bulk 操作 button 群 (全て採用 / 全て却下 / 追加分解 /
 * やり直し 4 件): WCAG 2.5.3 (Label in Name) 一括適合 + visible aria-hidden 統一。
 *
 * 課題: src/components/workspace/decompose-proposals-panel.tsx の 4 button は:
 *   1. proposals-accept-all: visible "全て採用" (漢字) vs 旧 aria-label "…をすべて採用"
 *      (かな) → 表記揺れ + 当該語が name 先頭ではない → WCAG 2.5.3 直接違反
 *   2. proposals-reject-all: 同じ "全て却下" vs "すべて却下" 表記揺れ + 非 prefix
 *   3. proposals-redecompose: visible "追加分解" / "再分解" が旧 aria-label
 *      "既存の保留中…で追加で AI 分解" / "AI 分解を再実行" に含まれず + aria-hidden 未統合
 *      → name に visible text 不在の最強違反
 *   4. proposals-redecompose-fresh: visible "やり直し" が旧 aria-label 末尾 substring
 *      で prefix では無く voice user 不整合
 *
 * fix (1 ファイル、4 button 一括 ~8 行差分):
 *   - 各 aria-label を visible text prefix 形に変更:
 *     - 全て採用 → 「全て採用 (保留中の提案 N 件)」 / pending「全て採用 中…」
 *     - 全て却下 → 「全て却下 (保留中の提案 N 件)」 / pending 同形
 *     - 追加分解 / 再分解 → 「追加分解 (既存の保留中 N 件を残して追加で AI 分解)」 /
 *       「再分解 (AI 分解を再実行)」
 *     - やり直し → 「やり直し (保留中の N 件を全て却下してから AI 分解)」
 *   - proposals-redecompose visible text を <span aria-hidden="true"> で wrap、
 *     aria-label 単独経路に統一 (iter844-858 と一貫)。他 3 button は元々 aria-hidden 維持。
 *
 * 検証: source-side regex assert + iter850/853/856/857/858 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // 1. proposals-accept-all aria-label visible "全て採用" prefix
  if (
    /aria-label=\{[\s\S]+?`全て採用 \(保留中の提案 \$\{list\.length\} 件\)`/.test(dp) &&
    /aria-label=\{[\s\S]+?`全て採用 中… \(保留中の提案 \$\{list\.length\} 件\)`/.test(dp)
  ) {
    findings.push({
      level: 'info',
      message: `proposals-accept-all aria-label visible "全て採用" prefix (表記揺れ解消) OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `proposals-accept-all aria-label NG` })
  }

  // 2. proposals-reject-all aria-label visible "全て却下" prefix
  if (
    /aria-label=\{[\s\S]+?`全て却下 \(保留中の提案 \$\{list\.length\} 件\)`/.test(dp) &&
    /aria-label=\{[\s\S]+?`全て却下 中… \(保留中の提案 \$\{list\.length\} 件\)`/.test(dp)
  ) {
    findings.push({
      level: 'info',
      message: `proposals-reject-all aria-label visible "全て却下" prefix (表記揺れ解消) OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `proposals-reject-all aria-label NG` })
  }

  // 3. proposals-redecompose aria-label visible "追加分解" / "再分解" prefix + aria-hidden
  if (
    /aria-label=\{[\s\S]+?`追加分解 \(既存の保留中 \$\{list\.length\} 件を残して追加で AI 分解\)`/.test(
      dp,
    ) &&
    /aria-label=\{[\s\S]+?'再分解 \(AI 分解を再実行\)'/.test(dp)
  ) {
    findings.push({
      level: 'info',
      message: `proposals-redecompose aria-label visible "追加分解" / "再分解" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `proposals-redecompose aria-label NG` })
  }
  if (/<span aria-hidden="true">\{list\.length > 0 \? '追加分解' : '再分解'\}<\/span>/.test(dp)) {
    findings.push({
      level: 'info',
      message: `proposals-redecompose visible "追加分解(再分解)" span aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `proposals-redecompose aria-hidden NG` })
  }

  // 4. proposals-redecompose-fresh aria-label visible "やり直し" prefix
  if (
    /aria-label=\{`やり直し \(保留中の \$\{list\.length\} 件を全て却下してから AI 分解\)`\}/.test(
      dp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `proposals-redecompose-fresh aria-label visible "やり直し" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `proposals-redecompose-fresh aria-label NG` })
  }

  // iter858 invariant: integrations-panel SourceCard
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{src\.enabled \? '無効化' : '有効化'\}<\/span>/.test(ip) &&
    /<span aria-hidden="true">履歴<\/span>/.test(ip)
  ) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: integrations-panel SourceCard aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: 破壊` })
  }

  // iter857 invariant: workflows-panel
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">編集<\/span>/.test(wp) &&
    /<span aria-hidden="true">履歴<\/span>/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `iter857 invariant: workflows-panel button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter857 invariant: 破壊` })
  }

  // iter856 invariant: sprint status buttons
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
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

  console.log(`\n=== Findings (proposals-bulk-buttons-label-in-name-iter859) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
