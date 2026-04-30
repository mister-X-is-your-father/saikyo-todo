/**
 * Phase 6.15 loop iter 380 — `MockEntriesPage` の table 要素に semantic /
 * a11y polish (caption + scope=col + <time dateTime>) を追加。
 *
 * 課題: src/app/mock-timesheet/entries/page.tsx の <table> は data-testid のみで
 *   - <caption> 不在 → SR ユーザは table 内に navigate しても何の表か context 不明
 *   - <th> 6 個全てに scope 属性なし → header-cell 関連付けが implicit のみ、
 *     SR (NVDA / VoiceOver) は cell read 時に列 header を announce しない場合あり
 *     (WCAG 1.3.1 Info and Relationships)
 *   - 日付 / 送信時刻 cell が plain text → SR 時刻読み上げが numeric として
 *     不自然、また `<time>` 不在で機械可読データとして識別されない
 *     (WCAG 1.3.1 / HTML5 semantic gap)
 *
 * fix: src/app/mock-timesheet/entries/page.tsx に 3 点を追加 (1 file 約 25 行差替)。
 *   1. <caption className="sr-only"> で table の概要 (件数 + 列名) を SR 用に追加、
 *      visual には影響なし
 *   2. 6 個の <th> 全てに scope="col" 追加 (列 header の明示)
 *   3. workDate cell を `<time dateTime={e.workDate}>` で wrap (YYYY-MM-DD format)、
 *      submittedAt cell を一時変数 submittedIso に集約し `<time dateTime={submittedIso}>`
 *      で wrap (toISOString 重複呼び出しも整理)
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。table semantic は SR / 自動化
 * tool / browser reader mode の全てに恩恵。
 *
 * 検証: source-side regex assert で codify。mock-timesheet/entries route は
 *   mock session 必須 + auth 必須 (workspace 配下) のため cloud env で full
 *   integration test 不可、source-side audit で代替。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/app/mock-timesheet/entries/page.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. caption sr-only 存在
  if (!/<caption[^>]*className="sr-only"[^>]*>[\s\S]*?送信済み工数/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: <caption className="sr-only"> に「送信済み工数」概要が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'caption sr-only OK' })
  }

  // 2. 6 個の th 全てに scope="col"
  const thMatches = src.match(/<th[^>]*>/g) ?? []
  const thWithScope = thMatches.filter((m) => /scope="col"/.test(m))
  if (thWithScope.length < 6) {
    findings.push({
      level: 'warning',
      message: `${target}: <th scope="col"> が 6 個必要だが ${thWithScope.length} 個しか無い`,
    })
  } else {
    findings.push({ level: 'info', message: `<th scope="col"> = ${thWithScope.length}/6 OK` })
  }

  // 3. workDate cell の <time dateTime={e.workDate}>
  if (!/<time\s+dateTime=\{e\.workDate\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: <time dateTime={e.workDate}> wrap が無い`,
    })
  }

  // 4. submittedAt cell の <time dateTime={submittedIso}>
  if (!/<time\s+dateTime=\{submittedIso\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: <time dateTime={submittedIso}> wrap が無い`,
    })
  }
  if (!/const submittedIso = new Date\(e\.submittedAt\)\.toISOString\(\)/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: submittedIso 変数集約が無い (toISOString 重複呼び出し残)`,
    })
  }

  // 5. iter378 / iter379 invariant 維持 (regression guard、同 series の隣接 iter)
  for (const f of [
    'src/components/mock-timesheet/mock-login-form.tsx',
    'src/components/mock-timesheet/mock-submit-form.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (!/function onInvalid\(errors:/.test(s) || !/handleSubmit\(onSubmit, onInvalid\)/.test(s)) {
      findings.push({
        level: 'warning',
        message: `${f}: iter378/iter379 onInvalid pattern が消えた (regression)`,
      })
    }
  }

  console.log(`\n=== Findings (mock-entries-table-iter380) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
