/**
 * Phase 6.15 loop iter 590 (mode-D Desktop a11y) —
 * items-board sprint filter <select> aria-label に raw key/UUID ではなく
 * 日本語 visible label / Sprint name を埋込み (WCAG 3.1.2 統一)。
 *
 * 課題: items-board.tsx 行 333-352 の sprint filter <select> は aria-label が
 *   `(現在: ${sprintFilter})` で raw value (active/none/UUID) を直接補間。
 *   visible options は日本語 "稼働中の Sprint" / "未割当のみ" / sprint.name だが
 *   SR ユーザは "現在: active" / "現在: 12345-uuid" のように raw key/UUID を
 *   聞かされ、visible 表示と乖離。WCAG 3.1.2 (Language of Parts)。
 *   未絞り込み hint も "(active / 未割当 / 個別 sprint)" → 日本語に統一。
 *
 * fix (1 ファイル ~10 行差分、iter589 status filter pattern を sprint に展開):
 *   - 'active' → '稼働中の Sprint'
 *   - 'none' → '未割当のみ'
 *   - UUID → sprintsList.data から sp.name を lookup
 *   - 未知 key/UUID → raw fallback で破綻防止
 *   - 未絞り込み hint も "稼働中 / 未割当 / 個別 sprint" に統一
 *
 * 検証: source-side regex assert + iter515-589 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )

  // 1. sprint filter aria-label JP 変換: 'active' → '稼働中の Sprint'
  if (/sprintFilter === 'active'\s*\n?\s*\?\s*'稼働中の Sprint'/.test(ib)) {
    findings.push({ level: 'info', message: `sprint 'active' → '稼働中の Sprint' 変換 OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint 'active' 変換なし` })
  }

  // 2. sprint filter aria-label JP 変換: 'none' → '未割当のみ'
  if (/sprintFilter === 'none'\s*\n?\s*\?\s*'未割当のみ'/.test(ib)) {
    findings.push({ level: 'info', message: `sprint 'none' → '未割当のみ' 変換 OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint 'none' 変換なし` })
  }

  // 3. sprint filter aria-label UUID lookup: sp.id === sprintFilter で sp.name を引く
  if (
    /\(sprintsList\.data \?\? \[\]\)\.find\(\(sp\) => sp\.id === sprintFilter\)\?\.name \?\?\s+sprintFilter/.test(
      ib,
    )
  ) {
    findings.push({ level: 'info', message: `sprint UUID → sp.name lookup + fallback OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint UUID lookup なし or fallback なし` })
  }

  // 4. 未絞り込み hint も JP に統一
  if (/'Sprint で絞り込み \(稼働中 \/ 未割当 \/ 個別 sprint\)'/.test(ib)) {
    findings.push({ level: 'info', message: `未絞り込み hint JP 揃え OK` })
  } else {
    findings.push({ level: 'warning', message: `未絞り込み hint JP 揃えなし` })
  }

  // 5. iter589 invariant: status filter aria-label JP 変換維持
  if (/statusFilter === 'todo'\s*\n?\s*\?\s*'TODO'/.test(ib)) {
    findings.push({ level: 'info', message: `iter589 invariant: status filter JP 変換維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter589 invariant: 破壊` })
  }

  // 6. iter588 invariant: calendar-view nav button aria-label 維持
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`前日 \(\$\{format\(subDays\(date, 1\), 'M月d日 \(eee\)'\)\}\) を表示`\}/.test(cv)
  ) {
    findings.push({ level: 'info', message: `iter588 invariant: calendar prev button 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter588 invariant: 破壊` })
  }

  console.log(`\n=== Findings (sprint-filter-i18n-iter590) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
