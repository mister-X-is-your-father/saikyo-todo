/**
 * Phase 6.15 loop iter 733 (mode-D Desktop a11y) —
 * create-workspace-form の slug field に format hint (aria-describedby) を追加。
 *
 * 課題: create-workspace-form.tsx の slug input は `pattern="^[a-z0-9-]+$"` を持つが、
 *   その制約を可視 / SR で説明する hint が無い。 placeholder="team-a" は examle のみで、
 *   入力済みの状態では消える。 SR ユーザはエラーになって初めて「何が悪かったのか」が
 *   分かる (「半角英数字とハイフンのみ」 を要求するパターンに気付けない)。
 *   signup-form の password field は signup-password-hint で「8 文字以上」を提示済の
 *   pattern なので、それに揃える。
 *
 * fix (1 ファイル ~7 行差分):
 *   - <p id="ws-slug-hint">小文字 (a-z) / 数字 / ハイフンのみ。最大 50 文字。例: team-a</p> を追加
 *   - aria-describedby を error 有無問わず常に slug-hint を含む形へ拡張
 *
 * 検証: source-side regex assert + iter720-732 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const cwf = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )

  // 1. slug-hint paragraph 追加
  const hasHintP =
    /<p id="ws-slug-hint" className="text-muted-foreground text-xs">\s*\n?\s*小文字 \(a-z\) \/ 数字 \/ ハイフンのみ。最大 50 文字。例: team-a\s*\n?\s*<\/p>/.test(
      cwf,
    )
  if (hasHintP) {
    findings.push({ level: 'info', message: `slug-hint paragraph 追加 OK` })
  } else {
    findings.push({ level: 'warning', message: `slug-hint paragraph 追加 不完全` })
  }

  // 2. aria-describedby が常に slug-hint を含むよう変更
  const hasDescribedBy =
    /aria-describedby=\{\s*\n?\s*form\.formState\.errors\.slug \? 'ws-slug-hint ws-slug-error' : 'ws-slug-hint'\s*\n?\s*\}/.test(
      cwf,
    )
  if (hasDescribedBy) {
    findings.push({ level: 'info', message: `slug aria-describedby 拡張 OK` })
  } else {
    findings.push({ level: 'warning', message: `slug aria-describedby 拡張 不完全` })
  }

  // 3. iter728 invariant: taskchute-view ol 件数動的化維持
  const tc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`今日の task を時刻昇順で並べた 1 列 timeline \$\{ordered\.length\} 件`\}/.test(
      tc,
    )
  ) {
    findings.push({ level: 'info', message: `iter728 invariant: taskchute-view ol 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter728 invariant: 破壊` })
  }

  // 4. iter727 invariant: ItemList ariaLabel prop 維持
  const ob = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/ariaLabel\?:\s*string/.test(ob)) {
    findings.push({ level: 'info', message: `iter727 invariant: ItemList ariaLabel prop 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter727 invariant: 破壊` })
  }

  // 5. iter720 invariant: cycle-check status dl 維持
  const ccs = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`ステータス分布 \(完了 \$\{stats\.done\} 件 \/ 未完了 \$\{stats\.inProgressOrTodo\} 件 \/ cancelled \$\{stats\.cancelled\} 件\)`\}/.test(
      ccs,
    )
  ) {
    findings.push({ level: 'info', message: `iter720 invariant: cycle-check status 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter720 invariant: 破壊` })
  }

  console.log(`\n=== Findings (create-workspace-slug-hint-iter733) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
