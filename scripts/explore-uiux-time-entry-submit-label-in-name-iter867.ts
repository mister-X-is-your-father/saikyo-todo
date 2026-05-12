/**
 * Phase 6.15 loop iter 867 (mode-D Desktop a11y) —
 * create-time-entry-submit: WCAG 2.5.3 (Label in Name) 適合 + visible aria-hidden 統一。
 *
 * 課題: src/components/time-entry/create-time-entry-form.tsx の create-time-entry-submit:
 *   - visible: "記録" / "..." (pending、NOT aria-hidden 統合)
 *   - 旧 aria-label: "稼働記録を作成" / "稼働記録を作成中…"
 *   - 問題:
 *     1. visible "記録" は "稼働記録" の suffix substring としては含まれるが visible
 *        word 単位 ("記録") では accessible name 先頭で無く voice user 発話「記録」 と
 *        name 先頭不一致 → WCAG 2.5.3 推奨形に未到達
 *     2. pending visible "..." は aria-label に substring としても **含まれない** =
 *        visible / accessible name 完全別物 (label-in-name 直接違反)
 *   iter844-866 で同 pattern を順次適合化済、本 form button が残る。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を visible "記録" prefix 形に変更:
 *     - 通常: 「記録 (稼働記録を作成)」
 *     - pending: 「記録 中… (稼働記録を作成中)」 ← "..." → "中…" で SR ユーザに状態を
 *       明示 (visible "..." は SR には伝わらないので aria-hidden で隠して aria-label
 *       で「中…」 を伝える)
 *   - visible "記録" / "..." を <span aria-hidden="true"> で wrap、aria-label 単独
 *     経路に統一 (iter844-866 と一貫)。
 *
 * 検証: source-side regex assert + iter862/863/864/865/866 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const cte = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )

  // 1. aria-label visible "記録" prefix
  if (
    /aria-label=\{create\.isPending \? '記録 中… \(稼働記録を作成中\)' : '記録 \(稼働記録を作成\)'\}/.test(
      cte,
    )
  ) {
    findings.push({
      level: 'info',
      message: `create-time-entry-submit aria-label visible "記録" prefix (pending 含む) OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `create-time-entry-submit aria-label NG` })
  }

  // 2. visible "記録" / "..." span aria-hidden
  if (/<span aria-hidden="true">\{create\.isPending \? '\.\.\.' : '記録'\}<\/span>/.test(cte)) {
    findings.push({
      level: 'info',
      message: `create-time-entry-submit visible "記録" / "..." span aria-hidden OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `create-time-entry-submit aria-hidden NG` })
  }

  // 3. data-testid 維持
  if (/data-testid="create-time-entry-submit"/.test(cte)) {
    findings.push({
      level: 'info',
      message: `create-time-entry-submit data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `create-time-entry-submit data-testid 破壊` })
  }

  // iter866 invariant: backlog-edit + research-btn
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/aria-label=\{`編集 \(「\$\{row\.original\.title\}」を編集\)`\}/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter866 invariant: backlog-edit aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter866 invariant: 破壊` })
  }

  // iter865 invariant: start-timer
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

  console.log(`\n=== Findings (time-entry-submit-label-in-name-iter867) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
