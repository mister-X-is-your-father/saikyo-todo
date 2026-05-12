/**
 * Phase 6.15 loop iter 864 (mode-D Desktop a11y) —
 * Item 関連 AI button 2 件 (ItemDecomposeButton / ItemPlanGenerateButton):
 * WCAG 2.5.3 (Label in Name) prefix 一括適合。
 *
 * 課題: 2 component:
 *   - ItemDecomposeButton: visible "AI 分解" / "分解中…" (aria-hidden 維持済み) vs 旧
 *     aria-label "「N」を AI 分解…" / "「N」を AI 分解中…" → visible が suffix substring
 *     (prefix 不一致)、pending 時の visible "分解中…" / aria-label "AI 分解中…" で
 *     state 名が微妙に異なる
 *   - ItemPlanGenerateButton: visible "Plan を生成" / "Plan 生成中…" (aria-hidden
 *     維持済み) vs 旧 aria-label "「N」の AI 担当が実行計画を comment に投下します" /
 *     "「N」の Plan を生成中…" → visible "Plan を生成" は aria-label に substring とし
 *     ても **含まれない** (label-in-name 直接違反)、pending 時の "Plan 生成中…" は
 *     aria-label "Plan を生成中…" と「を」 の有無で **不一致**
 *   iter844-863 で同 pattern を順次適合化済、AI flow button 2 件が残る。
 *
 * fix (2 ファイル、2 button 一括 ~6 行差分):
 *   - 各 aria-label を visible text prefix 形に変更:
 *     - AI 分解 / 分解中… → 「AI 分解 (「N」を AI 分解、子タスクを 3〜5 件作成)」 /
 *       「分解中… (「N」を AI 分解)」 / done「AI 分解 (「N」は完了済のため AI 分解不可)」
 *     - Plan を生成 / Plan 生成中… → 「Plan を生成 (「N」の AI 担当が実行計画を comment
 *       に投下します)」 / 「Plan 生成中… (「N」の Plan)」
 *   - visible は元々 aria-hidden 維持で aria-label の prefix 化のみで適合化
 *     (iter844-863 と一貫)。
 *
 * 検証: source-side regex assert + iter860/861/862/863 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. ItemDecomposeButton
  const idb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-decompose-button.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{[\s\S]+?`AI 分解 \(「\$\{item\.title\}」を AI 分解、子タスクを 3〜5 件作成\)`/.test(
      idb,
    ) &&
    /aria-label=\{[\s\S]+?`分解中… \(「\$\{item\.title\}」を AI 分解\)`/.test(idb) &&
    /aria-label=\{[\s\S]+?`AI 分解 \(「\$\{item\.title\}」は完了済のため AI 分解不可\)`/.test(idb)
  ) {
    findings.push({
      level: 'info',
      message: `ItemDecomposeButton aria-label visible "AI 分解" / "分解中…" prefix (done 含む) OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `ItemDecomposeButton aria-label NG` })
  }
  if (
    /<span aria-hidden="true">\{decompose\.isPending \? '分解中…' : 'AI 分解'\}<\/span>/.test(idb)
  ) {
    findings.push({
      level: 'info',
      message: `ItemDecomposeButton visible "AI 分解" / "分解中…" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `ItemDecomposeButton aria-hidden NG` })
  }

  // 2. ItemPlanGenerateButton
  const ipb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-plan-generate-button.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{[\s\S]+?`Plan を生成 \(「\$\{item\.title\}」の AI 担当が実行計画を comment に投下します\)`/.test(
      ipb,
    ) &&
    /aria-label=\{[\s\S]+?`Plan 生成中… \(「\$\{item\.title\}」の Plan\)`/.test(ipb)
  ) {
    findings.push({
      level: 'info',
      message: `ItemPlanGenerateButton aria-label visible "Plan を生成" / "Plan 生成中…" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `ItemPlanGenerateButton aria-label NG` })
  }
  if (
    /<span aria-hidden="true">\{generate\.isPending \? 'Plan 生成中…' : 'Plan を生成'\}<\/span>/.test(
      ipb,
    )
  ) {
    findings.push({
      level: 'info',
      message: `ItemPlanGenerateButton visible "Plan を生成" / "Plan 生成中…" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `ItemPlanGenerateButton aria-hidden NG` })
  }

  // 3. data-testid 維持
  if (
    /data-testid=\{`decompose-btn-\$\{item\.id\}`\}/.test(idb) &&
    /data-testid=\{`generate-plan-btn-\$\{item\.id\}`\}/.test(ipb)
  ) {
    findings.push({
      level: 'info',
      message: `2 button data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `2 button data-testid 破壊` })
  }

  // iter863 invariant: engineer-trigger-btn aria-label prefix
  const et = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{[\s\S]+?`Engineer に実装させる \(Engineer Agent に「\$\{item\.title\}」を実装させる/.test(
      et,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter863 invariant: engineer-trigger-btn aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter863 invariant: 破壊` })
  }

  // iter862 invariant: item-edit-save aria-label prefix
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

  console.log(`\n=== Findings (item-ai-buttons-label-in-name-iter864) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
