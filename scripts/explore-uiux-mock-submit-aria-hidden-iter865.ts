/**
 * Phase 6.15 loop iter 865 (mode-D Desktop a11y) —
 * mock-timesheet/mock-submit-form 送信 submit button:
 * WCAG 2.5.3 (Label in Name) 違反を修正 (ellipsis 不揃い)。
 *
 * 課題: src/components/mock-timesheet/mock-submit-form.tsx の 送信 submit
 *   button は visible pending "送信中..." (ASCII 3 dots ".") と aria-label
 *   "送信中… (mock-timesheet 工数送信処理を実行中)" (Unicode HORIZONTAL
 *   ELLIPSIS U+2026) で末尾 ellipsis 表現が不一致 → visible "送信中..." は
 *   aria-label の strict substring に **ならない** (= name に visible
 *   含まれず WCAG 2.5.3 失敗、voice control「送信中」発話で name 一致せず)。
 *   iter858 (instantiate-form) / iter862 (create-time-entry-form) と完全
 *   同型 ellipsis vocab 不揃い。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible 全 path (pending "送信中..." + idle "送信") を <span aria-hidden>
 *     で wrap、aria-label 単独経路に統一 (iter844-864 同 pattern)。
 *   - aria-label の mock-timesheet 工数送信処理 文脈は維持。
 *
 * 検証: source-side regex assert + iter735-864 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const msf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )

  // 1. mock-submit visible aria-hidden
  if (
    /<span aria-hidden="true">\{isPending \? '送信中\.\.\.' : '送信'\}<\/span>/.test(msf)
  ) {
    findings.push({
      level: 'info',
      message: `mock-submit visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-submit visible aria-hidden 未統合`,
    })
  }

  // 2. aria-label に mock-timesheet 工数送信処理 文脈維持
  if (/'送信中… \(mock-timesheet 工数送信処理を実行中\)'/.test(msf)) {
    findings.push({
      level: 'info',
      message: `mock-submit pending aria-label (Unicode ellipsis) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-submit pending aria-label 文脈破壊`,
    })
  }
  if (/'工数を送信 \(mock-timesheet 入力フォーム\)'/.test(msf)) {
    findings.push({
      level: 'info',
      message: `mock-submit idle aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-submit idle aria-label 文脈破壊`,
    })
  }

  // iter864 invariant: comment-post visible aria-hidden + 動詞統一
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\s*\{create\.isPending \? '投稿中…' : '投稿'\}\s*<\/span>/.test(
      ct,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter864 invariant: comment-post 動詞「投稿」統一 + aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter864 invariant 破壊` })
  }

  // iter862 invariant: create-time-entry-submit visible aria-hidden
  const cef = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{create\.isPending \? '\.\.\.' : '記録'\}<\/span>/.test(cef)) {
    findings.push({
      level: 'info',
      message: `iter862 invariant: create-time-entry-submit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter862 invariant 破壊` })
  }

  // iter858 invariant: instantiate-form visible aria-hidden (同型 ellipsis 不揃い fix)
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
      message: `iter858 invariant: instantiate-form ellipsis vocab fix 維持 OK`,
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

  console.log(`\n=== Findings (mock-submit-aria-hidden-iter865) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
