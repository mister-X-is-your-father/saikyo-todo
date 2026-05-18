/**
 * Phase 6.15 loop iter 941 (mode-M Mobile audit, basics track) —
 * sprints-panel.tsx 内 Sprint 期間 inline 編集 form の date input 2 個
 * (start / end) の mobile tap target 適合を codify。
 *
 * 経緯: iter888-892 で select 群の min-h-11 sweep 完了、iter939-940 で /login + /signup
 *   mobile baseline 取得。残 h-8 element の grep 探索で src/components/ 配下の h-8 element は
 *   sprints-panel.tsx の 2 個 (`#sprint-edit-start-${id}` / `#sprint-edit-end-${id}`、いずれも
 *   `<Input type="date" className="h-8 text-xs" />`) のみ。WCAG 2.5.5 (44x44) 未満 (h-8 = 32px)
 *   なので mobile 上で date picker 起動 tap が不正確になる。
 *
 * 修正: `className="h-8 text-xs"` → `className="min-h-11 text-xs"` (Input default の h-8 は
 *   そのまま、min-height 11 = 44px が CSS layout の computed height を引き上げる、text-xs は維持)
 *
 * 経路 B (本 script): className が `min-h-11 text-xs` を含むこと + iter735/940 invariant 維持を
 *   静的検証。経路 A (MCP playwright) は cloud env で実行可能だが Supabase 起動必要なため CI 再走時に
 *   実機 viewport bounding rect 検査を回す想定。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []
  const cwd = process.cwd()

  // 1. sprints-panel.tsx の 2 date input が min-h-11 text-xs を持つこと (h-8 残留無し)
  const sp = readFileSync(resolve(cwd, 'src/components/workspace/sprints-panel.tsx'), 'utf8')
  const minH11Count = (sp.match(/className="min-h-11 text-xs"/g) ?? []).length
  if (minH11Count >= 2) {
    findings.push({
      level: 'info',
      message: `sprints-panel.tsx 期間編集 date input 2 個 min-h-11 text-xs OK (${minH11Count} 箇所)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-panel.tsx min-h-11 text-xs 欠落 (${minH11Count} 箇所、期待 ≥ 2)`,
    })
  }
  if (/className="h-8 text-xs"/.test(sp)) {
    findings.push({
      level: 'warning',
      message: `sprints-panel.tsx に h-8 text-xs 残留 (mobile tap target NG)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `sprints-panel.tsx h-8 text-xs 残留なし (sweep 完了)`,
    })
  }

  // 2. 修正された input が data-testid (sprint-edit-start / sprint-edit-end) を維持
  if (
    /data-testid={`sprint-edit-start-\$\{sprint\.id\}`}/.test(sp) &&
    /data-testid={`sprint-edit-end-\$\{sprint\.id\}`}/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `sprint-edit-start / sprint-edit-end data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-edit-* data-testid 欠落` })
  }

  // 3. iter940 invariant: HANDOFF iter940 note の存在
  const handoff = readFileSync(resolve(cwd, 'HANDOFF.md'), 'utf8')
  if (/iter940/.test(handoff)) {
    findings.push({
      level: 'info',
      message: `iter940 invariant: HANDOFF iter940 note 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter940 invariant: 破壊` })
  }

  // 4. iter735 invariant: team-context-editor aria-keyshortcuts 2 箇所
  const tce = readFileSync(resolve(cwd, 'src/components/workspace/team-context-editor.tsx'), 'utf8')
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  // 5. iter939 invariant: login-form / signup-form submit button h-11 維持
  const lf = readFileSync(resolve(cwd, 'src/components/auth/login-form.tsx'), 'utf8')
  const sf = readFileSync(resolve(cwd, 'src/components/auth/signup-form.tsx'), 'utf8')
  if (/className="h-11 w-full"/.test(lf) && /className="h-11 w-full"/.test(sf)) {
    findings.push({
      level: 'info',
      message: `iter939 invariant: login/signup-form submit h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter939 invariant: 破壊` })
  }

  console.log(`\n=== Findings (sprints-edit-period-tap-target-iter941) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main()
