/**
 * Phase 6.15 loop iter 859 (mode-D Desktop a11y) —
 * 5 panel の EmptyState 「作成フォームへ」 CTA button:
 * WCAG 2.5.3 (Label in Name) 違反を 一括で修正 (panel-cross horizontal sweep)。
 *
 * 課題: 6 panel (sprints / goals / integrations / workflows / templates /
 *   time-entries) の EmptyState CTA button は同 vocabulary "作成フォームへ"
 *   visible で「<entity> 作成フォームの『<field>』入力欄にフォーカス」 系
 *   aria-label を持つ。visible "作成フォームへ" は助詞 "へ" 1 char + 後続
 *   "の" の前で連続せず aria-label の strict substring に **ならない**
 *   (= name に visible 含まれず WCAG 2.5.3 失敗)。voice control「作成フォーム
 *   へ」 発話で 6 panel 全て name 一致せず。
 *
 *   iter857 で templates-panel + time-entries-panel (本 iter858 で実装済) /
 *   iter857 で template の 1 件は対応済だったが、残 4 panel が未対応で
 *   ホットスポット sweep。
 *
 * fix (5 ファイル ~5 行差分、横展開):
 *   - 各 panel の visible "作成フォームへ" を <span aria-hidden="true"> で
 *     wrap、aria-label 単独経路に統一 (iter844-858 同 pattern)。
 *   - aria-label の「<entity> 作成フォームの『<field>』入力欄にフォーカス」
 *     文脈は維持 (= 飛び先 field 名が SR で読まれる、認知負荷低減)。
 *
 * 検証: 6 panel 全件 source-side regex assert + iter735-858 invariant
 *   cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const panels: Array<{ path: string; testid: string; ariaLabel: RegExp }> = [
    {
      path: 'src/components/workspace/sprints-panel.tsx',
      testid: 'sprints-empty-create',
      ariaLabel: /aria-label="Sprint 作成フォームの『名前』入力欄にフォーカス"/,
    },
    {
      path: 'src/components/workspace/goals-panel.tsx',
      testid: 'goals-empty-create',
      ariaLabel: /aria-label="Goal 作成フォームの『Objective』入力欄にフォーカス"/,
    },
    {
      path: 'src/components/integrations/integrations-panel.tsx',
      testid: 'integrations-empty-create',
      ariaLabel: /aria-label="Source 作成フォームの『名前』入力欄にフォーカス"/,
    },
    {
      path: 'src/components/workflow/workflows-panel.tsx',
      testid: 'workflows-empty-create',
      ariaLabel: /aria-label="Workflow 作成フォームの『名前』入力欄にフォーカス"/,
    },
    {
      path: 'src/components/time-entry/time-entries-panel.tsx',
      testid: 'time-entries-empty-create',
      ariaLabel: /aria-label="稼働記録 作成フォームの『勤務日』入力欄にフォーカス"/,
    },
    {
      path: 'src/components/template/templates-panel.tsx',
      testid: 'templates-empty-create',
      ariaLabel: /aria-label="Template 作成フォームの『名前』入力欄にフォーカス"/,
    },
  ]

  for (const p of panels) {
    const src = readFileSync(resolve(process.cwd(), p.path), 'utf8')
    if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(src)) {
      findings.push({
        level: 'info',
        message: `${p.testid}: visible 作成フォームへ aria-hidden 統合 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `${p.testid}: visible 作成フォームへ aria-hidden 未統合`,
      })
    }
    if (p.ariaLabel.test(src)) {
      findings.push({
        level: 'info',
        message: `${p.testid}: aria-label (フォーカス挙動説明) 維持 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `${p.testid}: aria-label 文脈破壊`,
      })
    }
  }

  // iter858 invariant: instantiate-form visible aria-hidden
  const inf = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\s*\{mut\.isPending \? '展開中\.\.\.' : '即実行 \(Instantiate\)'\}\s*<\/span>/.test(
      inf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: instantiate-form visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant 破壊` })
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

  console.log(`\n=== Findings (empty-state-form-cta-aria-hidden-iter859) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
