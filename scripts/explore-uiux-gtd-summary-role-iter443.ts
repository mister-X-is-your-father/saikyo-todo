/**
 * Phase 6.15 loop iter 443 (mode-D Desktop a11y) — InboxView の GTD bucket
 * count summary chip 群が `role="status"` (live region) を使っており inbox
 * 変更のたび SR 再 announce する anti-pattern を修正、codify (iter423
 * SeverityChip と同 pattern 連続水平展開)。
 *
 * 課題: src/components/workspace/inbox-view.tsx の GTD summary chip group:
 *   ```tsx
 *   <div role="status" aria-label="GTD 分類: 2 分以内 N 件、Project N 件、次の action N 件">
 *     <span>...⚡ 2 分 rule N</span>
 *     <span>...🗂 Project N</span>
 *     <span>...Next action N</span>
 *   </div>
 *   ```
 *   - `role="status"` は **live region** (= aria-live="polite" implicit)
 *   - inbox 変更で chip group が再 render → SR が「GTD 分類: 2 分以内 3 件、
 *     Project 1 件、次の action 5 件」を毎回 announce → 操作 noise
 *   - WAI-ARIA spec: role="status" は「処理完了 / loading 等 advisory text」
 *     用、永続的 classification group には不適切 (iter423 SeverityChip と同問題)
 *
 * fix: 1 ファイル ~6 行差分 (コメント込み)。
 *   - `role="status"` → `role="group"` に変更
 *   - aria-label は維持 (集約 description は SR が group focus 時に on-demand
 *     で聞ける)
 *
 * 機能追加なし、視覚 layout / 色 / chip 表示 全て不変、shadcn 編集なし。
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

  const path = 'src/components/workspace/inbox-view.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. role="group" + aria-label 配線 (inbox-gtd-summary 周辺)
  if (
    /data-testid="inbox-gtd-summary"[\s\S]{0,400}?role="group"[\s\S]{0,400}?aria-label=\{`GTD 分類:/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: GTD summary role="group" + aria-label 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: GTD summary role="group" + aria-label 配線 不在`,
    })
  }

  // 2. 旧 role="status" 残存 detector (regression — JSX prop として `\n          role="status"\n`
  //    を検出。コメント中の説明文字列は前方が `// ` で始まるので /^.*\/\/.*role="status"/m を除外)
  // 行頭が空白 + role="status" でかつ inbox-gtd-summary block 内に出現するか確認
  const inboxBlockMatch = src.match(
    /<div\s+className="mb-1[\s\S]{0,800}?data-testid="inbox-gtd-summary"[\s\S]{0,800}?>/,
  )
  const inboxBlock = inboxBlockMatch?.[0] ?? ''
  // JSX prop の role="status" (前方が空白 / 改行 のみ、 // コメント内は除外)
  const propRoleStatus = /^\s+role="status"/m.test(inboxBlock)
  if (propRoleStatus) {
    findings.push({
      level: 'error',
      message: `${path}: GTD summary 旧 JSX role="status" 残存 (regression — live region)`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `${path}: GTD summary 旧 JSX role="status" 不在 OK`,
    })
  }

  // 3. iter423 SeverityChip pattern が消えていないか consistency
  const sevPath = 'src/components/shared/severity-chip.tsx'
  const sevSrc = readFileSync(resolve(process.cwd(), sevPath), 'utf8')
  if (/<span\s+role="img"\s+className=\{baseCls\}/.test(sevSrc)) {
    findings.push({
      level: 'info',
      message: `severity-chip: iter423 role="img" 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `severity-chip: iter423 role="img" 消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (gtd-summary-role-iter443) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
