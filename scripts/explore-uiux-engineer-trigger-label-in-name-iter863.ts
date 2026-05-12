/**
 * Phase 6.15 loop iter 863 (mode-D Desktop a11y) —
 * engineer-trigger-button: WCAG 2.5.3 (Label in Name) 適合 + pending visible/aria-label 整合。
 *
 * 課題: src/components/workspace/engineer-trigger-button.tsx の engineer-trigger-btn:
 *   - visible: "🛠 Engineer に実装させる" (aria-hidden 維持済み) / "起動中…" (同)
 *   - 旧 aria-label: "Engineer Agent に「N」を実装させる…" / "Engineer Agent に「N」を投入中…"
 *   - 問題:
 *     1. visible "Engineer に実装させる" が aria-label suffix substring (prefix 不一致)
 *     2. visible "起動中…" と aria-label "投入中…" で **用語不一致** = 同一ボタンの
 *        状態名が visible / SR で完全別物 → WCAG 2.5.3 直接違反 (substring も無)
 *   iter844-862 で同 pattern を順次適合化済、本 button が残る。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を visible text prefix 形に統一:
 *     - 通常: 「Engineer に実装させる (Engineer Agent に「N」を実装させる…)」
 *     - pending: 「起動中… (Engineer Agent に「N」を投入)」 ← "起動中…" / "投入" を併記
 *       で SR / sighted の用語乖離を解消 + name 先頭に visible 状態名
 *   - autoPr=true の場合は括弧内に「PR 自動起票」 を追記。
 *   - visible "🛠 Engineer に実装させる" / "起動中…" は元々 aria-hidden 維持で
 *     aria-label の prefix 化のみで適合化 (iter844-862 と一貫)。
 *
 * 検証: source-side regex assert + iter860/861/862 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const et = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )

  // 1. engineer-trigger-btn aria-label visible "Engineer に実装させる" prefix
  if (
    /aria-label=\{[\s\S]+?`Engineer に実装させる \(Engineer Agent に「\$\{item\.title\}」を実装させる\$\{autoPr \? '、PR 自動起票' : ''\}\)`/.test(
      et,
    )
  ) {
    findings.push({
      level: 'info',
      message: `engineer-trigger-btn aria-label visible "Engineer に実装させる" prefix OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `engineer-trigger-btn aria-label prefix NG` })
  }

  // 2. pending aria-label visible "起動中…" prefix + 用語整合
  if (/aria-label=\{[\s\S]+?`起動中… \(Engineer Agent に「\$\{item\.title\}」を投入\)`/.test(et)) {
    findings.push({
      level: 'info',
      message: `engineer-trigger-btn pending aria-label visible "起動中…" prefix + 用語整合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `engineer-trigger-btn pending aria-label NG` })
  }

  // 3. visible "🛠 Engineer に実装させる" / "起動中…" span aria-hidden 維持
  if (
    /<span aria-hidden="true">起動中…<\/span>/.test(et) &&
    /<span aria-hidden="true">🛠 Engineer に実装させる<\/span>/.test(et)
  ) {
    findings.push({
      level: 'info',
      message: `engineer-trigger-btn visible 2 状態 span aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `engineer-trigger-btn aria-hidden NG` })
  }

  // 4. data-testid 維持
  if (/data-testid="engineer-trigger-btn"/.test(et)) {
    findings.push({
      level: 'info',
      message: `engineer-trigger-btn data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `engineer-trigger-btn data-testid 破壊` })
  }

  // iter862 invariant: item-edit footer save aria-label prefix
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

  // iter861 invariant: item-edit-reload aria-label prefix
  if (
    /aria-label="最新を読み込み \(自分の編集内容を破棄してサーバの最新値を読み込み直す\)"/.test(ied)
  ) {
    findings.push({
      level: 'info',
      message: `iter861 invariant: item-edit-reload aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter861 invariant: 破壊` })
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

  console.log(`\n=== Findings (engineer-trigger-label-in-name-iter863) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
