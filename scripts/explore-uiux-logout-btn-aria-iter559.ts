/**
 * Phase 6.15 loop iter 559 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * HomePage logout Button に aria-label + data-testid + min-h-11 を補完。
 *
 * 課題: app/page.tsx 行 36-38 の logout Button は visible text "ログアウト" のみで
 *   aria-label / data-testid 不在 + size="sm" (h-9 = 36px) で min-h-11 (44px) 漏れ。
 *   home page の唯一の auth / session button だが size="sm" のままで mobile WCAG 違反。
 *
 * fix (1 ファイル ~5 行差分):
 *   - className="min-h-11" 追加 (44x44 tap target)
 *   - data-testid="logout-btn"
 *   - aria-label="ログアウトしてログイン画面に戻る"
 *
 * +5 行差分 (multi-line 整形)、機能不変、視覚 layout 不変 (visible text "ログアウト" 維持)、
 * shadcn 編集なし、type=submit / variant / size invariant 維持。
 *
 * 検証: source-side regex assert + iter515-558 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const page = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')

  // 1. logout-btn aria-label + data-testid + min-h-11
  if (
    /data-testid="logout-btn"/.test(page) &&
    // iter1724: em-dash visible-prefix convention に migration、regex 追従。
    /aria-label="ログアウト — ログイン画面に戻る"/.test(page) &&
    /className="min-h-11"/.test(page)
  ) {
    findings.push({
      level: 'info',
      message: `app/page.tsx: logout-btn aria-label + data-testid + min-h-11 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `app/page.tsx: logout-btn aria-label / data-testid / min-h-11 不在`,
    })
  }

  // 2. 既存 type=submit / variant / size 維持
  if (/type="submit"/.test(page) && /variant="ghost"/.test(page) && /size="sm"/.test(page)) {
    findings.push({
      level: 'info',
      message: `app/page.tsx: 既存 type=submit / variant=ghost / size=sm 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `app/page.tsx: 既存属性破壊`,
    })
  }

  // 3. iter558 invariant: budget-edit-cancel aria-label 維持
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label="AI 月次コスト上限の編集をキャンセル"/.test(bp) &&
    /data-testid="budget-edit-cancel"/.test(bp)
  ) {
    findings.push({
      level: 'info',
      message: `iter558 invariant: budget-edit-cancel aria 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter558 invariant: 破壊`,
    })
  }

  // 4. iter515 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (logout-btn-aria-iter559) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
