/**
 * Phase 6.15 loop iter 865 (mode-D Desktop a11y) —
 * start-timer-button: WCAG 2.5.3 (Label in Name) 適合 (visible label を aria-label prefix へ)。
 *
 * 課題: src/components/workspace/start-timer-button.tsx の start-timer-{id}:
 *   - visible label: "計測開始" / "別 Item を停止して計測開始" / compact "切替して開始"
 *     (aria-hidden 維持済み iter310)
 *   - 旧 aria-label fullHint: "「N」のタイマーを開始" / "「A」のタイマーを停止して「N」の
 *     計測を開始"
 *   - 既存コメント (iter310) で "WCAG 2.5.3 ラベルと名前の整合性: 短縮 visible label
 *     "切替して開始" は full aria-label の prefix" と書かれているが **実際には不一致**:
 *     - aria-label は「「A」のタイマーを停止して」 で起点、visible "切替して開始" は
 *       suffix substring としても含まれない
 *     - 通常時も「「N」のタイマーを開始」 起点、visible "計測開始" は suffix substring
 *   → WCAG 2.5.3 (Label in Name) 直接違反 (substring 一致は voice engine 依存)
 *   iter844-864 で同 pattern を順次適合化済、本 button が残る。
 *
 * fix (1 ファイル ~6 行差分):
 *   - aria-label を visible label prefix 形に変更:
 *     - 「計測開始 (「N」のタイマーを開始)」
 *     - 「別 Item を停止して計測開始 (「A」のタイマーを停止して「N」の計測を開始)」
 *     - compact「切替して開始 (「A」のタイマーを停止して「N」の計測を開始)」
 *   - visible label は元々 aria-hidden 維持で aria-label の prefix 化のみで適合化
 *     (iter844-864 と一貫)。Timer icon は aria-hidden 維持。
 *   - 既存コメント (iter310) も実装と整合させて更新。
 *
 * 検証: source-side regex assert + iter860/861/862/863/864 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const st = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/start-timer-button.tsx'),
    'utf8',
  )

  // 1. fullHint が visibleLabel prefix
  if (
    /const fullHint = otherActive\s+\? `\$\{visibleLabel\} \(「\$\{activeItemTitle\}」のタイマーを停止して「\$\{item\.title\}」の計測を開始\)`\s+: `\$\{visibleLabel\} \(「\$\{item\.title\}」のタイマーを開始\)`/.test(
      st,
    )
  ) {
    findings.push({
      level: 'info',
      message: `start-timer fullHint が visibleLabel prefix で構成されている OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `start-timer fullHint visibleLabel prefix NG` })
  }

  // 2. visible label span aria-hidden 維持 (iter310 invariant)
  if (/<span aria-hidden="true">\{visibleLabel\}<\/span>/.test(st)) {
    findings.push({
      level: 'info',
      message: `iter310 invariant: start-timer visible label span aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter310 invariant: 破壊` })
  }

  // 3. visibleLabel 3 形態 (計測開始 / 別 Item を停止して計測開始 / 切替して開始) 維持
  if (
    /'計測開始'/.test(st) &&
    /'別 Item を停止して計測開始'/.test(st) &&
    /'切替して開始'/.test(st)
  ) {
    findings.push({
      level: 'info',
      message: `start-timer visible label 3 形態維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `start-timer visible label 3 形態破壊` })
  }

  // 4. data-testid 維持
  if (/data-testid=\{`start-timer-\$\{item\.id\}`\}/.test(st)) {
    findings.push({
      level: 'info',
      message: `start-timer data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `start-timer data-testid 破壊` })
  }

  // iter864 invariant: ItemDecomposeButton
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

  // iter863 invariant: engineer-trigger-btn
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

  console.log(`\n=== Findings (start-timer-label-in-name-iter865) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
