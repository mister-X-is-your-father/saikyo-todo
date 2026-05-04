/**
 * Phase 6.15 loop iter 736 (mode-D Desktop a11y) —
 * signup-form の email field に format hint paragraph + aria-describedby を追加
 * (iter733 race の create-workspace-form slug / iter735 race の signup displayName と
 * 同 pattern を email field に展開)。
 *
 * 課題: signup-form.tsx 行 87-107 の email input は zod で email 形式を強制するが、
 *   その上限 / 想定用途を可視 / SR で説明する hint がない。displayName / password に
 *   は hint paragraph を持たせたが email だけ非対称。
 *
 * fix (1 ファイル ~10 行差分):
 *   - `<p id="signup-email-hint">ログイン用 Magic Link の送信先になります。例: you@example.com</p>` 追加
 *   - aria-describedby を error 有無問わず常に signup-email-hint を含む形に拡張
 *
 * 検証: source-side regex assert + iter727-735 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sf = readFileSync(resolve(process.cwd(), 'src/components/auth/signup-form.tsx'), 'utf8')

  // 1. signup-email-hint paragraph 追加
  const hasHint =
    /<p id="signup-email-hint" className="text-muted-foreground text-xs">\s*\n\s*ログイン用 Magic Link の送信先になります。例: you@example\.com\s*\n\s*<\/p>/.test(
      sf,
    )
  // 2. aria-describedby が常に signup-email-hint を含む
  const hasDescribedBy =
    /aria-describedby=\{\s*\n?\s*form\.formState\.errors\.email\s*\n?\s*\?\s*['"]signup-email-hint signup-email-error['"]\s*\n?\s*:\s*['"]signup-email-hint['"]/.test(
      sf,
    )
  // 3. iter736 説明 comment が存在
  const hasComment = /iter736: email format hint を pattern エラー前に提示/.test(sf)

  if (hasHint && hasDescribedBy && hasComment) {
    findings.push({ level: 'info', message: `signup email-hint + describedby OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `signup email-hint 不完全 (hint=${hasHint} desc=${hasDescribedBy} comment=${hasComment})`,
    })
  }

  // 4. iter735 race invariant: displayName-hint 維持
  if (
    /<p id="displayName-hint" className="text-muted-foreground text-xs">\s*\n\s*チームメンバーに表示される名前。最大 50 文字。/.test(
      sf,
    )
  ) {
    findings.push({ level: 'info', message: `iter735 race invariant: displayName-hint 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter735 race invariant: 破壊` })
  }

  // 5. iter735 invariant: team-context-editor textarea aria-keyshortcuts 維持
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

  // 6. iter734 invariant: workspace-mode radiogroup 維持
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

  // 7. iter733 race invariant: ws-slug-hint 維持
  const cwf = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if (
    /<p id="ws-slug-hint" className="text-muted-foreground text-xs">\s*\n\s*小文字 \(a-z\) \/ 数字 \/ ハイフンのみ。最大 50 文字。例: team-a/.test(
      cwf,
    )
  ) {
    findings.push({ level: 'info', message: `iter733 race invariant: ws-slug-hint 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter733 race invariant: 破壊` })
  }

  console.log(`\n=== Findings (signup-email-hint-iter736) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
