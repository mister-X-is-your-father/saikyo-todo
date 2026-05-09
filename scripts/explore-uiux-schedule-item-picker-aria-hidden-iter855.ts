/**
 * Phase 6.15 loop iter 855 (mode-D Desktop a11y) —
 * schedule-item-picker 3 button visible text を aria-hidden span で wrap。
 *
 * 課題: src/components/schedule/schedule-item-picker.tsx には 3 箇所 aria-label
 *   付き button + visible text 露出パターンがある:
 *   - 行 80-88: item-pick button (aria-label "item「title」を選択..." + visible {it.title})
 *   - 行 114-123: 割込み追加 button (aria-label "割込み / 休憩として追加..." + visible "割込みとして追加")
 *   - 行 128-137: cancel button (aria-label "task pick をキャンセル" + visible "キャンセル")
 *
 *   いずれも aria-label が完全 content を含むのに visible が aria-hidden 無しで
 *   SR は 2 経路で読み上げ重複。iter844-854 と同 vocabulary。
 *
 * fix (1 ファイル +5/-3 行):
 *   - 1: <span className="truncate" aria-hidden="true">{it.title}</span>
 *   - 2: <span aria-hidden="true">割込みとして追加</span>
 *   - 3: <span aria-hidden="true">キャンセル</span>
 *
 * 検証: source-side regex assert + iter853 / iter854 / iter851 / iter852
 *   invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sip = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )

  // 1: item-pick button visible {it.title} aria-hidden
  if (
    /<span className="truncate" aria-hidden="true">[\s\S]*?\{it\.title\}[\s\S]*?<\/span>/.test(sip)
  ) {
    findings.push({
      level: 'info',
      message: `iter855-a: schedule-picker item-pick button {it.title} aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter855-a: schedule-picker item-pick button {it.title} aria-hidden 不完全`,
    })
  }

  // 2: 割込み button visible aria-hidden
  if (/<span aria-hidden="true">割込みとして追加<\/span>/.test(sip)) {
    findings.push({
      level: 'info',
      message: `iter855-b: schedule-picker 割込み追加 button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter855-b: schedule-picker 割込み追加 button aria-hidden 不完全`,
    })
  }

  // 3: cancel button visible aria-hidden
  if (/<span aria-hidden="true">キャンセル<\/span>/.test(sip)) {
    findings.push({
      level: 'info',
      message: `iter855-c: schedule-picker cancel button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter855-c: schedule-picker cancel button aria-hidden 不完全`,
    })
  }

  // invariant: 3 button の aria-label 維持
  if (
    /aria-label=\{`item「\$\{it\.title\}」を選択\$\{it\.isMust \? ' \(MUST\)' : ''\}`\}/.test(
      sip,
    ) &&
    /aria-label=\{`割込み \/ 休憩として追加\$\{interruptNote \? ` \(メモ: \$\{interruptNote\}\)` : ''\}`\}/.test(
      sip,
    ) &&
    /aria-label="task pick をキャンセル"/.test(sip)
  ) {
    findings.push({
      level: 'info',
      message: `iter855 invariant: schedule-picker 3 button aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855 invariant: aria-label 破壊` })
  }

  // iter853 / iter854 invariant
  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')
  if (
    (ap.match(/<span aria-hidden="true">\{label\}<\/span>/g) ?? []).length >= 2 &&
    /<span aria-hidden="true">\{t\.name\}<\/span>/.test(tp)
  ) {
    findings.push({
      level: 'info',
      message: `iter853 / iter854 invariant: assignee-picker + tag-picker 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter853 / iter854 invariant: 破壊` })
  }

  console.log(`\n=== Findings (schedule-item-picker-aria-hidden-iter855) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
