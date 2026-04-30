/**
 * Phase 6.15 loop iter 509 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * StartTimerButton (Today / Backlog 行 inline timer 起動 button) を 44x44 化、codify。
 *
 * 課題: src/components/workspace/start-timer-button.tsx 行 116-127 の Button が
 *   `size={isCompact ? 'sm' : 'default'}` で `className="min-h-11"` 漏れ。
 *   isCompact=true (Today / Backlog 行) では h-8 = 32px、isCompact=false (dialog) では h-9 = 36px、
 *   両方 mobile WCAG 2.5.5 AAA 違反。
 *
 *   StartTimerButton は TickTick 風タイマー機能のメイン entry point で、Today / Backlog の
 *   row 内で頻繁 tap される。
 *
 * fix (1 ファイル 1 行追加):
 *   - `<Button size={isCompact ? 'sm' : 'default'} ...>` に `className="min-h-11"` 追加
 *   - default size (h-9) でも min-h-11 で 44px 達成、isCompact (h-8) でも 44px 達成
 *
 * 累計 **132 button mobile target 達成** (iter460-509 で 50 fix iter、+1 件)。
 * 機能不変、shadcn 編集なし、aria-label / data-testid / title 維持。
 *
 * 検証: source-side regex assert + iter446 invariant (isMine=true 時 role="img" + aria-label) 維持。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/start-timer-button.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. Button に className="min-h-11" 配線
  if (
    /<Button[\s\S]{0,300}?size=\{isCompact \? 'sm' : 'default'\}[\s\S]{0,200}?className="min-h-11"/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: Button min-h-11 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: Button min-h-11 配線 不在` })
  }

  // 2. data-testid + aria-label + title 維持 (regression)
  if (
    /data-testid=\{`start-timer-\$\{item\.id\}`\}/.test(src) &&
    /aria-label=\{fullHint\}/.test(src) &&
    /title=\{otherActive \? fullHint : undefined\}/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: data-testid + aria-label + title 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: data-testid / aria-label / title 破壊` })
  }

  // 3. Timer icon aria-hidden 維持
  if (/<Timer className="mr-1 h-3\.5 w-3\.5" aria-hidden="true" \/>/.test(src)) {
    findings.push({ level: 'info', message: `${path}: Timer icon aria-hidden 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: Timer icon aria-hidden 破壊` })
  }

  // 4. iter446 invariant: isMine=true 時 role="img" + 集約 aria-label 維持
  if (
    /<div[\s\S]{0,300}?data-testid=\{`start-timer-active-\$\{item\.id\}`\}[\s\S]{0,100}?role="img"[\s\S]{0,200}?aria-label=/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: iter446 invariant (isMine=true role=img + aria-label) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: iter446 invariant 破壊`,
    })
  }

  // 5. otherActive confirm flow 維持 (regression、機能不変確認)
  if (/window\.confirm\(/.test(src) && /toast\.warning/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: otherActive confirm + toast.warning 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: otherActive confirm flow 破壊`,
    })
  }

  console.log(`\n=== Findings (start-timer-min-h-iter509) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
