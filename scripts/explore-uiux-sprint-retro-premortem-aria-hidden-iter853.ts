/**
 * Phase 6.15 loop iter 853 (mode-D Desktop a11y) —
 * sprints-panel 振り返り生成 / Pre-mortem 生成 button:
 * WCAG 2.5.3 (Label in Name) 違反を修正。
 *
 * 課題: src/components/workspace/sprints-panel.tsx 内の
 *   `sprint-retro-${id}` / `sprint-premortem-${id}` button は visible text
 *   ("振り返り生成" / "Pre-mortem 生成" 等) と aria-label
 *   ("...の振り返りを生成" / "...の Pre-mortem を生成" 等) で 助詞 "を"
 *   1 文字を挟むため visible が aria-label の strict substring に **ならない**
 *   (= name に visible 含まれず WCAG 2.5.3 失敗)。pending / 完了済再生成 /
 *   初回生成 の 3 path 全てで失敗。
 *
 * fix (1 ファイル ~6 行差分):
 *   - 両 button の visible text 全て (条件分岐 3 + 2 path) を
 *     <span aria-hidden="true"> で wrap、aria-label 単独経路に統一
 *     (iter844-852 同 pattern)。
 *   - aria-label 自体は既存の文脈付き形を維持 (PM Agent 説明 / 件数 / 状態)。
 *
 * 検証: source-side regex assert + iter735-852 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. 振り返り生成 button visible は aria-hidden span で wrap
  if (
    /<span aria-hidden="true">\s*\{retroPending \? '振り返り生成中…' : '振り返り生成'\}\s*<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-retro visible text aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-retro visible text aria-hidden 未統合`,
    })
  }

  // 2. Pre-mortem button visible は aria-hidden span で wrap (3 path)
  if (
    /<span aria-hidden="true">\s*\{premortemPending\s+\?\s+'Pre-mortem 生成中…'\s+:\s+sprint\.premortemGeneratedAt\s+\?\s+'Pre-mortem 再生成'\s+:\s+'Pre-mortem 生成'\}\s*<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint-premortem visible text aria-hidden 統合 OK (3 path)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-premortem visible text aria-hidden 未統合`,
    })
  }

  // 3. data-testid 維持
  if (
    /data-testid=\{`sprint-retro-\$\{sprint\.id\}`\}/.test(sp) &&
    /data-testid=\{`sprint-premortem-\$\{sprint\.id\}`\}/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `sprint-retro / sprint-premortem data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint button data-testid 破壊` })
  }

  // 4. aria-label に PM Agent 説明文脈を維持 (Retro)
  if (/`Sprint「\$\{sprint\.name\}」の振り返り Doc を生成 \(PM Agent /.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-retro aria-label 文脈 (PM Agent 説明) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-retro aria-label 文脈破壊` })
  }

  // 5. aria-label に PM Agent 説明文脈を維持 (Pre-mortem)
  if (/`Sprint「\$\{sprint\.name\}」の Pre-mortem を生成 \(PM Agent /.test(sp)) {
    findings.push({
      level: 'info',
      message: `sprint-premortem aria-label 文脈 (PM Agent 説明) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `sprint-premortem aria-label 文脈破壊` })
  }

  // iter852 invariant: bulk-clear aria-label + visible aria-hidden
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (/aria-label=\{`選択 \$\{count\} 件を解除`\}/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: bulk-clear aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter852 invariant (clear aria-label) 破壊` })
  }
  if (/<span aria-hidden="true">解除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: bulk-clear visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter852 invariant (clear visible) 破壊` })
  }

  // iter851 invariant: bulk-status visible aria-hidden
  if (/<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: bulk-status visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant 破壊` })
  }

  // iter849 invariant: calendar-view today reset button aria-hidden
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">今日<\/span>/.test(cv)) {
    findings.push({
      level: 'info',
      message: `iter849 invariant: calendar-view 今日 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter849 invariant 破壊` })
  }

  console.log(`\n=== Findings (sprint-retro-premortem-aria-hidden-iter853) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
