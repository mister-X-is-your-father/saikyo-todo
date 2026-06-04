/**
 * Phase 6.15 loop iter 560 (mode-D Desktop a11y) —
 * ThemeToggle Button の aria-label を動的化 (現在 theme → 切替先 theme を明示)。
 *
 * 課題: theme-toggle.tsx 行 17-25 の Button は aria-label="テーマ切替" 静的で
 *   "切替先" が不明瞭。SR ユーザは dark mode 中なら "light に切替" を期待するが
 *   "テーマ切替" だけだと操作結果がわからない。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を resolvedTheme で動的に切替:
 *     - dark なら "ライトテーマに切替"
 *     - light なら "ダークテーマに切替"
 *
 * +3 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、type=button / variant /
 * size / className / data-testid / onClick invariant 維持、icon (Sun / Moon) 維持。
 *
 * 検証: source-side regex assert + iter515-559 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tt = readFileSync(resolve(process.cwd(), 'src/components/shared/theme-toggle.tsx'), 'utf8')

  // 1. aria-label dynamic
  if (
    /aria-label=\{\s*resolvedTheme === 'dark' \? 'ライトテーマに切替' : 'ダークテーマに切替'\s*\}/.test(
      tt,
    )
  ) {
    findings.push({
      level: 'info',
      message: `theme-toggle.tsx: aria-label 動的 (dark/light 切替先明示) 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `theme-toggle.tsx: aria-label 動的化 不在`,
    })
  }

  // 2. 既存 type=button / variant / size / className / data-testid 維持
  if (
    /type="button"/.test(tt) &&
    /variant="ghost"/.test(tt) &&
    /size="icon"/.test(tt) &&
    /className="min-h-11 min-w-11"/.test(tt) &&
    /data-testid="theme-toggle"/.test(tt)
  ) {
    findings.push({
      level: 'info',
      message: `theme-toggle.tsx: 既存 type/variant/size/className/data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `theme-toggle.tsx: 既存属性破壊`,
    })
  }

  // 3. iter559 invariant: logout-btn aria-label 維持
  //    iter1724: em-dash visible-prefix convention に migration、regex 追従。
  const page = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  if (
    /aria-label="ログアウト — ログイン画面に戻る"/.test(page) &&
    /data-testid="logout-btn"/.test(page)
  ) {
    findings.push({
      level: 'info',
      message: `iter559 invariant: logout-btn aria 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter559 invariant: 破壊`,
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

  console.log(`\n=== Findings (theme-toggle-aria-iter560) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
