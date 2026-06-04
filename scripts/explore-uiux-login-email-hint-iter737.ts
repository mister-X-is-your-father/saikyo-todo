/**
 * Phase 6.15 loop iter 737 (mode-D Desktop a11y) —
 * login-form の email field に format hint paragraph + aria-describedby を追加
 * (signup-form iter735 race / iter736 race と同 pattern を login form に展開)。
 *
 * 課題: login-form.tsx 行 56-77 の email input は zod で email 形式を強制するが、
 *   想定用途 (= signup 時に登録したメール) が SR で見えない。signup-form で
 *   email-hint を導入したので login も揃える。
 *
 * fix (1 ファイル ~10 行差分):
 *   - `<p id="login-email-hint">サインアップ時に登録したメールアドレス。例: you@example.com</p>` 追加
 *   - aria-describedby を error 有無問わず常に login-email-hint を含む形に拡張
 *
 * 検証: source-side regex assert + iter727-736 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const lf = readFileSync(resolve(process.cwd(), 'src/components/auth/login-form.tsx'), 'utf8')

  // 1. login-email-hint paragraph 追加
  const hasHint =
    /<p id="login-email-hint" className="text-muted-foreground text-xs">\s*\n\s*サインアップ時に登録したメールアドレス。例: you@example\.com\s*\n\s*<\/p>/.test(
      lf,
    )
  // 2. aria-describedby が常に login-email-hint を含む
  //    iter1715: error id を `email-error` → `login-email-error` に prefix 統一したので regex 追従。
  const hasDescribedBy =
    /aria-describedby=\{\s*\n?\s*form\.formState\.errors\.email\s*\n?\s*\?\s*['"]login-email-hint login-email-error['"]\s*\n?\s*:\s*['"]login-email-hint['"]/.test(
      lf,
    )
  // 3. iter737 説明 comment 存在
  const hasComment = /iter737: signup-form 側/.test(lf)

  if (hasHint && hasDescribedBy && hasComment) {
    findings.push({ level: 'info', message: `login email-hint + describedby OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `login email-hint 不完全 (hint=${hasHint} desc=${hasDescribedBy} comment=${hasComment})`,
    })
  }

  // 4. iter736 race invariant: signup email-hint 維持
  const sf = readFileSync(resolve(process.cwd(), 'src/components/auth/signup-form.tsx'), 'utf8')
  if (
    /<p id="signup-email-hint" className="text-muted-foreground text-xs">\s*\n\s*ログイン用 Magic Link の送信先になります/.test(
      sf,
    )
  ) {
    findings.push({ level: 'info', message: `iter736 race invariant: signup email-hint 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter736 race invariant: 破壊` })
  }

  // 5. iter735 race invariant: signup displayName-hint 維持
  if (
    /<p id="displayName-hint" className="text-muted-foreground text-xs">\s*\n\s*チームメンバーに表示される名前/.test(
      sf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter735 race invariant: signup displayName-hint 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 race invariant: 破壊` })
  }

  // 6. iter735 invariant: team-context-editor textarea aria-keyshortcuts 維持
  const tc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  if (/aria-keyshortcuts="Meta\+Enter Control\+Enter"/.test(tc)) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor textarea keyshortcuts 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  // 7. iter734 invariant: workspace-mode radiogroup 維持
  const ws = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`workspace の default 作業モード \(現在: \$\{MODE_OPTIONS\.find\(\(o\) => o\.value === current\)\?\.label \?\? current\}\)`\}/.test(
      ws,
    )
  ) {
    findings.push({ level: 'info', message: `iter734 invariant: mode-selector radiogroup 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter734 invariant: 破壊` })
  }

  console.log(`\n=== Findings (login-email-hint-iter737) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
