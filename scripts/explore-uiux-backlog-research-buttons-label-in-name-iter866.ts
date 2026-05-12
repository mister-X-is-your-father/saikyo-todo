/**
 * Phase 6.15 loop iter 866 (mode-D Desktop a11y) —
 * backlog 編集 + ItemResearchButton (AI 調査) 2 件:
 * WCAG 2.5.3 (Label in Name) 一括 prefix 適合 + visible aria-hidden 統一。
 *
 * 課題:
 *   - backlog-edit-{id}: visible "編集" NOT aria-hidden 統合、aria-label「「N」を編集」
 *     で "編集" は suffix substring (prefix 不一致)
 *   - research-btn-{id}: visible "AI 調査" / "調査中…" (aria-hidden 維持済み) vs 旧
 *     aria-label「「N」を AI 調査して Doc を作成」 / 「「N」を AI 調査中…」 → visible が
 *     中間 substring (prefix 不一致)、pending visible "調査中…" / aria-label "AI 調査中…"
 *     で state 名微妙不一致
 *   iter844-865 で同 pattern を順次適合化済、BacklogView row 内 2 button が残る。
 *
 * fix (2 ファイル、2 button 一括 ~5 行差分):
 *   - 各 aria-label を visible text prefix 形に変更:
 *     - 編集 → 「編集 (「N」を編集)」 + visible "編集" を span aria-hidden で wrap
 *     - AI 調査 / 調査中… → 「AI 調査 (「N」を AI 調査して Doc を作成)」 /
 *       「調査中… (「N」を AI 調査)」 / done「AI 調査 (「N」は完了済のため AI 調査不可)」
 *   - 既存 aria-hidden 維持 (research-btn) + 新規 aria-hidden (backlog-edit)。
 *
 * 検証: source-side regex assert + iter860/861/862/863/864/865 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. BacklogView backlog-edit
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/aria-label=\{`編集 \(「\$\{row\.original\.title\}」を編集\)`\}/.test(bv)) {
    findings.push({
      level: 'info',
      message: `backlog-edit aria-label visible "編集" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `backlog-edit aria-label NG` })
  }
  // backlog-edit row 内 visible "編集" span aria-hidden (data-testid 直後 context で確認)
  if (
    /data-testid=\{`backlog-edit-\$\{row\.original\.id\}`\}[\s\S]+?<span aria-hidden="true">編集<\/span>/.test(
      bv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `backlog-edit visible "編集" span aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `backlog-edit aria-hidden NG` })
  }

  // 2. ItemResearchButton research-btn
  const irb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-research-button.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{[\s\S]+?`AI 調査 \(「\$\{item\.title\}」を AI 調査して Doc を作成\)`/.test(irb) &&
    /aria-label=\{[\s\S]+?`調査中… \(「\$\{item\.title\}」を AI 調査\)`/.test(irb) &&
    /aria-label=\{[\s\S]+?`AI 調査 \(「\$\{item\.title\}」は完了済のため AI 調査不可\)`/.test(irb)
  ) {
    findings.push({
      level: 'info',
      message: `research-btn aria-label visible "AI 調査" / "調査中…" prefix (done 含む) OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `research-btn aria-label NG` })
  }
  if (
    /<span aria-hidden="true">\{research\.isPending \? '調査中…' : 'AI 調査'\}<\/span>/.test(irb)
  ) {
    findings.push({
      level: 'info',
      message: `research-btn visible "AI 調査" / "調査中…" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `research-btn aria-hidden NG` })
  }

  // 3. data-testid 維持
  if (
    /data-testid=\{`backlog-edit-\$\{row\.original\.id\}`\}/.test(bv) &&
    /data-testid=\{`research-btn-\$\{item\.id\}`\}/.test(irb)
  ) {
    findings.push({
      level: 'info',
      message: `2 button data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `2 button data-testid 破壊` })
  }

  // iter865 invariant: start-timer-button visibleLabel prefix
  const st = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/start-timer-button.tsx'),
    'utf8',
  )
  if (/`\$\{visibleLabel\} \(「\$\{item\.title\}」のタイマーを開始\)`/.test(st)) {
    findings.push({
      level: 'info',
      message: `iter865 invariant: start-timer fullHint prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter865 invariant: 破壊` })
  }

  // iter864 invariant: ItemDecomposeButton prefix
  const idb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-decompose-button.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{[\s\S]+?`AI 分解 \(「\$\{item\.title\}」を AI 分解、子タスクを 3〜5 件作成\)`/.test(
      idb,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter864 invariant: ItemDecomposeButton aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter864 invariant: 破壊` })
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

  console.log(`\n=== Findings (backlog-research-buttons-label-in-name-iter866) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
