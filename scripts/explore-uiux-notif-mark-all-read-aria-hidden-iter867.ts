/**
 * Phase 6.15 loop iter 867 (mode-D Desktop a11y) —
 * notification-bell 全て既読 (notification-mark-all-read) button:
 * WCAG 2.5.3 (Label in Name) 違反 — kanji vs hiragana vocab 不一致 を修正。
 *
 * 課題: src/components/workspace/notification-bell.tsx の
 *   `notification-mark-all-read` button は visible "全て既読" (kanji 全て) を
 *   持つが aria-label "未読 N 件をすべて既読にする" / "未読 N 件を既読化中…"
 *   は hiragana "すべて" を使っており vocab 不一致。visible "全て既読"
 *   (kanji 全て) は aria-label の strict substring に **ならない**
 *   (= name に visible 含まれず WCAG 2.5.3 失敗、voice control「全て既読」
 *   発話で name 一致せず)。iter866 (proposals 全て採用 / 全て却下 既存対応)
 *   と完全同型 vocab 不揃い。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible "全て既読" を <span aria-hidden> で wrap、aria-label 単独経路
 *     に統一 (iter844-866 同 pattern)。
 *   - aria-label の 未読件数 + 既読化文脈は維持 (= 件数 + 状態説明 SR)。
 *
 * 検証: source-side regex assert + iter735-866 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )

  // 1. mark-all-read visible aria-hidden
  if (/<span aria-hidden="true">全て既読<\/span>/.test(nb)) {
    findings.push({
      level: 'info',
      message: `notification-mark-all-read visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `notification-mark-all-read visible aria-hidden 未統合`,
    })
  }

  // 2. aria-label に「未読 N 件をすべて既読にする」 文脈維持
  if (/`未読 \$\{unreadCount\} 件をすべて既読にする`/.test(nb)) {
    findings.push({
      level: 'info',
      message: `mark-all-read aria-label (件数 + 既読化) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mark-all-read aria-label 文脈破壊`,
    })
  }

  // 3. data-testid 維持
  if (/data-testid="notification-mark-all-read"/.test(nb)) {
    findings.push({
      level: 'info',
      message: `notification-mark-all-read testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `notification-mark-all-read testid 破壊` })
  }

  // 4. notification-bell trigger button (icon-only) は引き続き aria-label 維持
  if (/aria-label=\{`通知 \(未読 \$\{unreadCount\} 件\)`\}/.test(nb)) {
    findings.push({
      level: 'info',
      message: `notification-bell trigger aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `notification-bell trigger aria-label 破壊` })
  }

  // iter866 invariant: proposals-redecompose visible aria-hidden
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{list\.length > 0 \? '追加分解' : '再分解'\}<\/span>/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `iter866 invariant: proposals-redecompose visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter866 invariant 破壊` })
  }

  // iter865 invariant: mock-submit visible aria-hidden
  const msf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{isPending \? '送信中\.\.\.' : '送信'\}<\/span>/.test(msf)) {
    findings.push({
      level: 'info',
      message: `iter865 invariant: mock-submit visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter865 invariant 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (notif-mark-all-read-aria-hidden-iter867) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
