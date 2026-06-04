/**
 * Phase 6.15 loop iter 735 (mode-D Desktop a11y) —
 * signup-form の displayName field に format hint paragraph + aria-describedby を
 * 追加 (iter733 race の create-workspace-form slug pattern を auth form に拡張)。
 *
 * 課題: signup-form.tsx 行 56-77 の displayName input は `maxLength={50}` を強制
 *   するが、その上限 / 想定用途を可視 / SR で説明する hint がない。signup-form
 *   password field は signup-password-hint で「8 文字以上」を提示済 (aria-describedby
 *   で input に bind) なので、displayName にも同じ pattern を適用。
 *
 * fix (1 ファイル ~10 行差分):
 *   - `<p id="displayName-hint">チームメンバーに表示される名前。最大 50 文字。</p>` 追加
 *   - aria-describedby を error 有無問わず常に displayName-hint を含む形に拡張
 *     (`'displayName-hint displayName-error'` / `'displayName-hint'`)
 *
 * 検証: source-side regex assert + iter727-734 invariant cross-check。
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

  // 1. displayName-hint paragraph 追加
  //    iter1723: id を `displayName-hint` → `signup-displayName-hint` に prefix 統一したので regex 追従。
  const hasHint =
    /<p id="signup-displayName-hint" className="text-muted-foreground text-xs">\s*\n\s*チームメンバーに表示される名前。最大 50 文字。\s*\n\s*<\/p>/.test(
      sf,
    )
  // 2. aria-describedby が常に signup-displayName-hint を含む
  //    iter1723: error id も `displayName-error` → `signup-displayName-error` に追従。
  const hasDescribedBy =
    /aria-describedby=\{\s*\n?\s*form\.formState\.errors\.displayName\s*\n?\s*\?\s*['"]signup-displayName-hint signup-displayName-error['"]\s*\n?\s*:\s*['"]signup-displayName-hint['"]/.test(
      sf,
    )
  // 3. iter735 説明 comment が存在
  const hasComment = /iter735: pattern エラー前に format hint を出す/.test(sf)

  if (hasHint && hasDescribedBy && hasComment) {
    findings.push({ level: 'info', message: `signup displayName-hint + describedby OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `signup displayName-hint 不完全 (hint=${hasHint} desc=${hasDescribedBy} comment=${hasComment})`,
    })
  }

  // 4. iter734 invariant: workspace-mode radiogroup 動的 aria-label 維持
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

  // 5. iter733 invariant (race): create-workspace-form slug-hint 維持
  const cwf = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if (
    /<p id="ws-slug-hint" className="text-muted-foreground text-xs">\s*\n\s*小文字 \(a-z\) \/ 数字 \/ ハイフンのみ。最大 50 文字。例: team-a/.test(
      cwf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter733 race invariant: ws-slug-hint 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter733 race invariant: 破壊` })
  }

  // 6. iter732 invariant: decompose bulk group 維持
  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`AI 分解提案の bulk 操作 \(全て採用 \/ 全て却下 \/ 再分解、保留中 \$\{list\.length\} 件\)`\}/.test(
      dp,
    )
  ) {
    findings.push({ level: 'info', message: `iter732 invariant: decompose bulk group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter732 invariant: 破壊` })
  }

  console.log(`\n=== Findings (signup-displayname-hint-iter735) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
