/**
 * Phase 6.15 loop iter 1709 — Today view header chip 2 件 (streak / done-count)
 * に aria-atomic="true" を付与、SR partial announce による context 欠落を解消。
 *
 * 課題: src/components/workspace/today-view.tsx の today-streak-chip + today-done-count-chip
 *   は role="status" (= implicit live region) を持つが aria-atomic は default false。
 *   chip text の一部だけ変化したとき (= 数字だけ count up、milestone label が変わる)、
 *   SR は変更部分のみ partial announce で chip 全体 context が欠落 (「シルバー」 だけ
 *   読み上げて「完了 streak」 prefix が失われる 等)。bulk-action-bar bulk-count
 *   (line 86) は同 pattern で `aria-atomic="true"` を採用済、Today chip 2 件のみ
 *   default 値で sibling と divergent。
 *
 * fix: 両 chip に `aria-atomic="true"` を付与 (各 1 line + 各 5-6 line comment)。
 *   chip 全体を full re-announce で SR は変更後の完全 context を hear。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const target = 'src/components/workspace/today-view.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. today-streak-chip に aria-atomic="true" 付与
  // streak chip block を抜き出し aria-atomic を check
  const streakBlock = src.match(
    /data-testid="today-streak-chip"[\s\S]{0,800}aria-label=\{`完了 streak — /,
  )
  if (!streakBlock) {
    findings.push({ level: 'warning', message: `${target}: streak chip block 取得失敗` })
  } else if (!/aria-atomic="true"/.test(streakBlock[0])) {
    findings.push({
      level: 'warning',
      message: `${target}: today-streak-chip に aria-atomic="true" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'today-streak-chip aria-atomic="true" OK' })
  }

  // 2. today-done-count-chip に aria-atomic="true" 付与
  const doneBlock = src.match(
    /data-testid="today-done-count-chip"[\s\S]{0,1500}aria-label=\{`\$\{doneTodaySignal\.text\}/,
  )
  if (!doneBlock) {
    findings.push({ level: 'warning', message: `${target}: done-count chip block 取得失敗` })
  } else if (!/aria-atomic="true"/.test(doneBlock[0])) {
    findings.push({
      level: 'warning',
      message: `${target}: today-done-count-chip に aria-atomic="true" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'today-done-count-chip aria-atomic="true" OK' })
  }

  // 3. bulk-action-bar bulk-count invariant (本 fix の reference pattern)
  const bulk = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (!/data-testid="bulk-count"/.test(bulk) || !/aria-atomic="true"/.test(bulk)) {
    findings.push({
      level: 'warning',
      message: 'bulk-action-bar.tsx: bulk-count aria-atomic="true" reference pattern が壊れた',
    })
  }

  // 4. iter1708 done-count aria-label invariant (regression guard)
  if (!/aria-label=\{`\$\{doneTodaySignal\.text\}\$\{doneTodayPriorityDetail\}`\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: iter1708 done-count visible-prefix aria-label invariant が壊れた`,
    })
  }

  console.log(`\n=== Findings (today-chip-aria-atomic-iter1709) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
