/**
 * Phase 6.15 loop iter 511 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * TimeEntriesTable Sync / 再 Sync button を 44x44 化、codify。
 *
 * 課題: src/components/time-entry/time-entries-table.tsx 行 132-148 の Button が
 *   `size="sm"` (h-8 = 32px) で `className="min-h-11"` 漏れ。
 *
 *   各 time-entry row 末尾の Sync trigger button で external API 同期を再実行する重要 action。
 *   mobile 32px tap で誤タップで意図しない sync trigger (= API 課金 / rate limit 消費)
 *   が事故に繋がる可能性。
 *
 * fix (1 ファイル 1 行追加):
 *   - `<Button size="sm" variant="outline" ...>` に `className="min-h-11"` 挿入
 *
 * 累計 **134 button mobile target 達成** (iter460-511 で 52 fix iter、+1 件)。
 * 機能不変、shadcn 編集なし、aria-label / aria-busy / data-testid 維持。
 *
 * 検証: source-side regex assert + iter380 invariant (table caption + th scope) 維持 cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/time-entry/time-entries-table.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. Sync Button に min-h-11 配線
  if (
    /<Button\s+size="sm"\s+className="min-h-11"\s+variant="outline"[\s\S]{0,200}?disabled=\{sync\.isPending\}/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: Sync Button min-h-11 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: Sync Button min-h-11 配線 不在` })
  }

  // 2. data-testid + aria-label + aria-busy 維持
  if (
    /data-testid=\{`time-entry-sync-\$\{e\.id\}`\}/.test(src) &&
    /aria-busy=\{sync\.isPending \|\| undefined\}/.test(src) &&
    /aria-label=\{[\s\S]{0,300}?「\$\{e\.description \|\| '\(無題\)'\}」/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: data-testid + aria-busy + aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: data-testid / aria-busy / aria-label 破壊`,
    })
  }

  // 3. iter380 invariant: caption + th scope=col 6 件 維持
  if (
    /<caption className="sr-only">[\s\S]{0,200}?稼働時間記録一覧/.test(src) &&
    (src.match(/<th scope="col"/g) ?? []).length >= 6
  ) {
    findings.push({
      level: 'info',
      message: `${path}: iter380 invariant (caption + th scope=col >=6) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: iter380 invariant 破壊` })
  }

  // 4. SyncBadge aria-label (regression — sync status 表示が WCAG 1.4.1 守れる)
  if (
    /aria-label="外部同期: 完了"/.test(src) &&
    /aria-label="外部同期: 失敗"/.test(src) &&
    /aria-label="外部同期: 未実行"/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: SyncBadge 3 状態 aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: SyncBadge aria-label 破壊` })
  }

  console.log(`\n=== Findings (time-entries-sync-min-h-iter511) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
