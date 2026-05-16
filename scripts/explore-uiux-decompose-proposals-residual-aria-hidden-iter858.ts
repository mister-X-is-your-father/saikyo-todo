/**
 * Phase 6.15 loop iter 858 (mode-D Desktop a11y) —
 * decompose-proposals-panel の残 4 button (Agent 中止 / 追加分解|再分解 dynamic /
 * 編集 form キャンセル / 編集 form 保存 dynamic) visible text を
 * <span aria-hidden="true"> で wrap し、aria-label 単独経路に統一。
 *
 * 経緯: iter842 で同 panel の 4 button (全て採用 / 全て却下 / やり直し / ✓ 採用) 修正済
 *   → 残 4 button (中止 / 追加分解|再分解 / キャンセル / 保存) も同 pattern で sweep。
 *   いずれも aria-label に完全 content (「実行中の Agent を中止」 / 「既存の保留中 N 件を残して
 *   追加で AI 分解」 / 「「{title}」の編集をキャンセル」 / 「提案「{title}」の編集を保存」 等)
 *   を含むのに visible text は aria-hidden 無し。
 *
 * 修正: 4 button visible text 一括で <span aria-hidden="true"> で wrap、
 *   aria-label 単独経路に統一。dynamic 2 状態 (追加分解|再分解 / 保存中…|保存) も
 *   span 包含。
 *
 * 検証: source-side regex assert + iter735/842/849-857 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // 1. Agent 中止 button visible "中止" aria-hidden
  if (/<span aria-hidden="true">中止<\/span>/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel agent-cancel visible "中止" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel agent-cancel visible aria-hidden 未統合`,
    })
  }

  // 2. Redecompose button visible (dynamic 2 状態) aria-hidden
  if (/<span aria-hidden="true">\{list\.length > 0 \? '追加分解' : '再分解'\}<\/span>/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel redecompose visible (dynamic 2 状態) aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel redecompose visible aria-hidden 未統合`,
    })
  }

  // 3. 編集 form キャンセル button visible "キャンセル" aria-hidden
  if (/<span aria-hidden="true">キャンセル<\/span>/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel edit-cancel visible "キャンセル" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel edit-cancel visible aria-hidden 未統合`,
    })
  }

  // 4. 編集 form 保存 button visible (dynamic 2 状態) aria-hidden
  if (/<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel edit-save visible (dynamic 2 状態) aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel edit-save visible aria-hidden 未統合`,
    })
  }

  // 5. iter842 invariant: 既存 4 span aria-hidden 維持 (全て採用 / 全て却下 / やり直し / ✓ 採用)
  if (
    /<span aria-hidden="true">全て採用<\/span>/.test(dpp) &&
    /<span aria-hidden="true">全て却下<\/span>/.test(dpp) &&
    /<span aria-hidden="true">やり直し<\/span>/.test(dpp) &&
    /<span aria-hidden="true">✓ 採用<\/span>/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `iter842 invariant: 既存 4 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter842 invariant: 破壊` })
  }

  // 6. data-testid 主要維持
  const testidOk =
    /data-testid="agent-cancel"/.test(dpp) &&
    /data-testid="proposals-redecompose"/.test(dpp) &&
    /data-testid=\{`proposal-\$\{proposal\.id\}-edit-cancel`\}/.test(dpp) &&
    /data-testid=\{`proposal-\$\{proposal\.id\}-save`\}/.test(dpp)
  if (testidOk) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel 4 button data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel data-testid 破壊`,
    })
  }

  // iter857 invariant: sprints-panel 7 button aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">期間<\/span>/.test(sp) &&
    /<span aria-hidden="true">稼働開始<\/span>/.test(sp) &&
    /<span aria-hidden="true">中止<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter857 invariant: sprints-panel sprint action aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter857 invariant: 破壊` })
  }

  // iter856 invariant: goals-panel 5 status button
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    (gp.match(/<span aria-hidden="true">アーカイブ<\/span>/g) ?? []).length >= 2 &&
    (gp.match(/<span aria-hidden="true">active に戻す<\/span>/g) ?? []).length >= 2
  ) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: goals-panel aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: 破壊` })
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

  console.log(`\n=== Findings (decompose-proposals-residual-aria-hidden-iter858) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
