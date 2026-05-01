/**
 * Phase 6.15 loop iter 526 (mode-D Desktop a11y) —
 * QuickAdd submit Button に aria-busy を補完
 * (iter521-525 form/Button aria-busy sweep の継続、QuickAdd は workspace 起動後 最頻 entry point)。
 *
 * 課題: quick-add.tsx 行 154-171 の submit Button は disabled + aria-label 動的
 *   付与済 (4 状態切替: title 無し / MUST / pending / normal) だが aria-busy 不在。
 *   QuickAdd は workspace 起動後 一番頻繁に使われる core UI で SR が pending 状態を
 *   察知できないと "作成中…" 表示の前後で混乱しやすい。
 *
 * fix (1 ファイル ~1 行差分):
 *   - submit Button に aria-busy={create.isPending || undefined}
 *
 * 機能不変、視覚 layout 不変 (min-h-11 維持)、shadcn 編集なし、disabled / aria-label /
 * data-testid / iter350 (autoComplete=off) / iter441 (input description) invariant 維持。
 *
 * 検証: source-side regex assert + iter515-525 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')

  // 1. quick-add-submit aria-busy
  if (
    /data-testid="quick-add-submit"[\s\S]{0,200}aria-busy=\{create\.isPending \|\| undefined\}/.test(
      qa,
    ) ||
    /aria-busy=\{create\.isPending \|\| undefined\}[\s\S]{0,200}data-testid="quick-add-submit"/.test(
      qa,
    )
  ) {
    findings.push({
      level: 'info',
      message: `quick-add.tsx: quick-add-submit aria-busy 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add.tsx: quick-add-submit aria-busy 不在`,
    })
  }

  // 2. 既存 disabled / data-testid / 4 状態 aria-label 維持
  if (
    /disabled=\{create\.isPending \|\| !preview\?\.title \|\| \(preview\?\.isMust \?\? false\)\}/.test(
      qa,
    ) &&
    /data-testid="quick-add-submit"/.test(qa) &&
    /'タスクを作成するにはタイトルを入力してください'/.test(qa) &&
    /'MUST タスクは編集ダイアログから DoD/.test(qa)
  ) {
    findings.push({
      level: 'info',
      message: `quick-add.tsx: 既存 disabled / data-testid / 4 状態 aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add.tsx: 既存属性破壊`,
    })
  }

  // 3. iter350 autoComplete=off + iter441 aria-describedby invariant
  if (
    /id="quick-add-input"[\s\S]{0,1500}autoComplete="off"/.test(qa) &&
    /aria-describedby="quick-add-preview quick-add-hint"/.test(qa)
  ) {
    findings.push({
      level: 'info',
      message: `quick-add.tsx: iter350 autoComplete=off + iter441 aria-describedby 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `quick-add.tsx: iter350 / iter441 invariant 破壊`,
    })
  }

  // 4. iter515-525 invariant cross-check (anchor 3 件)
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  const ok515 = /aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)
  const ok525 = (sp.match(/aria-busy=\{changing \|\| undefined\}/g) ?? []).length === 4
  const ok524 =
    /data-testid="budget-save-btn"[\s\S]{0,200}aria-busy=\{update\.isPending \|\| undefined\}|aria-busy=\{update\.isPending \|\| undefined\}[\s\S]{0,200}data-testid="budget-save-btn"/.test(
      bp,
    )
  if (ok515 && ok525 && ok524) {
    findings.push({
      level: 'info',
      message: `iter515-525 invariant: 重要 anchor 3 件維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515-525 invariant: 破壊 (515=${ok515} 524=${ok524} 525=${ok525})`,
    })
  }

  console.log(`\n=== Findings (quick-add-aria-busy-iter526) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
