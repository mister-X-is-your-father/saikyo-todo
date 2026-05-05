/**
 * Phase 6.15 loop iter 802 (mode-D Desktop a11y) —
 * inbox-view GTD 分類 chip 群を aria-hidden 化 (iter800/iter801 同 pattern、
 * 内側 chip に aria-hidden を集約)。
 *
 * 課題: inbox-view.tsx 行 137-153 の GTD chip 群 ("2 分 rule N" / "Project N" /
 *   "Next action N") は parent group (role="group" + aria-label) に既に
 *   3 count を完全展開した aria-label が付いているのに、内側 chip text は
 *   aria-hidden 無しで SR が duplicate read。iter800 (tag-picker) /
 *   iter801 (assignee-picker) と同 pattern を inbox GTD chip 群に展開。
 *
 * fix (1 ファイル ~6 行差分、3 chip 各々の outer span に aria-hidden=true 移動 +
 *   既存 emoji span の aria-hidden は子 span だけでなく chip 全体に集約):
 *   - 「2 分 rule N」chip 全体に aria-hidden="true"
 *   - 「Project N」chip 全体に aria-hidden="true"
 *   - 「Next action N」chip 全体に aria-hidden="true"
 *   - 内側 emoji span は aria-hidden 削除 (chip 親で hidden 済、二重不要)
 *
 * 検証: source-side regex assert + iter735-801 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  // 3 chip にそれぞれ aria-hidden が付いているかチェック
  const ariaHiddenCount = (
    iv.match(
      /inline-flex items-center gap-0\.5 rounded-full border [^"]+\s*"\s*aria-hidden="true"/g,
    ) ??
    iv.match(/border-emerald-300 bg-emerald-50 text-emerald-700"\s*\n?\s*aria-hidden="true"/g) ??
    []
  ).length
  // Simpler check: each chip class string followed by aria-hidden="true"
  const emeraldChip = /text-emerald-700"\s*\n\s*aria-hidden="true"/.test(iv)
  const skyChip = /text-sky-700"\s*\n\s*aria-hidden="true"/.test(iv)
  const slateChip = /text-slate-700"\s*\n\s*aria-hidden="true"/.test(iv)
  if (emeraldChip && skyChip && slateChip) {
    findings.push({
      level: 'info',
      message: `inbox-view GTD chip 3 種 aria-hidden OK (parent group aria-label 経路統一)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `inbox-view GTD chip aria-hidden 不完全 (emerald=${emeraldChip} sky=${skyChip} slate=${slateChip})`,
    })
  }

  // iter801 invariant: assignee-picker trigger inner aria-hidden
  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  if (
    /<span className="text-muted-foreground" aria-hidden="true">\s*\n?\s*未アサイン\s*\n?\s*<\/span>/.test(
      ap,
    ) &&
    /<span className="truncate" aria-hidden="true">/.test(ap)
  ) {
    findings.push({
      level: 'info',
      message: `iter801 invariant: assignee-picker trigger inner aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter801 invariant: 破壊` })
  }

  // iter800 invariant: tag-picker trigger inner aria-hidden
  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')
  if (
    /<span className="text-muted-foreground" aria-hidden="true">\s*\n?\s*タグなし\s*\n?\s*<\/span>/.test(
      tp,
    ) &&
    /<span className="flex flex-wrap gap-1" aria-hidden="true">/.test(tp)
  ) {
    findings.push({
      level: 'info',
      message: `iter800 invariant: tag-picker trigger inner aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter800 invariant: 破壊` })
  }

  // iter798 invariant: items-board view switcher 6 main button aria-label
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (
    /aria-label="Today \(今日のタスク優先順、scheduledFor=今日 \+ 期限近接\)"/.test(ib) &&
    /aria-label="Dashboard \(PDCA \/ 進捗 \/ 健全性 widget の集約画面\)"/.test(ib)
  ) {
    findings.push({
      level: 'info',
      message: `iter798 invariant: items-board view switcher aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter798 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor
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

  // ariaHiddenCount は実際の正規表現 match 用 (上の logic は別方式)
  void ariaHiddenCount

  console.log(`\n=== Findings (inbox-gtd-chip-aria-hidden-iter802) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
