/**
 * Phase 6.15 loop iter 860 (mode-D Desktop a11y) —
 * 3 view (today / inbox / items-board) の EmptyState 「クイック追加にフォーカス
 * (キー: q)」 CTA button: WCAG 2.5.3 (Label in Name) 違反を一括修正。
 *
 * 課題: 3 view の EmptyState CTA は visible "クイック追加にフォーカス
 *   (キー: q)" を持つが aria-label "クイック追加入力欄にフォーカス (q
 *   キーでも可)" は visible に無い "入力欄" 3 char と "(q キーでも可)" 表記
 *   差で visible は strict substring に **ならない** (= name に visible
 *   含まれず WCAG 2.5.3 失敗、3 view 一斉)。voice control「クイック追加に
 *   フォーカス」 発話で 3 view 全件 name 一致せず。
 *
 * fix (3 ファイル ~3 行差分):
 *   - 各 view の visible を <span aria-hidden="true"> で wrap、aria-label
 *     単独経路に統一 (iter844-859 同 pattern)。
 *   - aria-label の 入力欄説明 + q shortcut hint は維持 (= 飛び先 input + q
 *     キーでも可、SR / voice 双方説明)。
 *
 * 検証: 3 view source-side regex assert + iter735-859 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const views: Array<{ path: string; testid: string }> = [
    {
      path: 'src/components/workspace/today-view.tsx',
      testid: 'today-empty-quick-add',
    },
    {
      path: 'src/components/workspace/inbox-view.tsx',
      testid: 'inbox-empty-quick-add',
    },
    {
      path: 'src/components/workspace/items-board.tsx',
      testid: 'board-empty-quick-add',
    },
  ]

  for (const v of views) {
    const src = readFileSync(resolve(process.cwd(), v.path), 'utf8')
    if (
      /<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(src)
    ) {
      findings.push({
        level: 'info',
        message: `${v.testid}: visible aria-hidden 統合 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `${v.testid}: visible aria-hidden 未統合`,
      })
    }
    if (/aria-label="クイック追加入力欄にフォーカス \(q キーでも可\)"/.test(src)) {
      findings.push({
        level: 'info',
        message: `${v.testid}: aria-label (入力欄 + q shortcut hint) 維持 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `${v.testid}: aria-label 文脈破壊`,
      })
    }
    if (/aria-keyshortcuts="q"/.test(src)) {
      findings.push({
        level: 'info',
        message: `${v.testid}: aria-keyshortcuts="q" 維持 OK`,
      })
    } else {
      findings.push({
        level: 'warning',
        message: `${v.testid}: aria-keyshortcuts 破壊`,
      })
    }
  }

  // iter859 invariant: empty-state form CTA aria-hidden (1 panel sample)
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `iter859 invariant: templates 作成フォームへ aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter859 invariant 破壊` })
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

  console.log(`\n=== Findings (quick-add-empty-cta-aria-hidden-iter860) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
