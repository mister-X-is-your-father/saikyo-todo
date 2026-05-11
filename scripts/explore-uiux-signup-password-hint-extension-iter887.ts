/**
 * Phase 6.15 loop iter 887 (mode-D UX content polish) —
 * signup-form password hint を「8 文字以上」 single line → 強度 / パスフレーズ推奨 / 再認証経路
 * を含む 1 行 hint に拡充。
 *
 * 課題: signup-password-hint は「8 文字以上」 のみで、新規パスワード設定時の
 *   「強度どうする?」「忘れたらどう復旧?」 mental model 不足。login-form (iter741) は
 *   「サインアップ時に設定したパスワード (8 文字以上)。忘れた場合は再サインアップ。」 で
 *   helpful な context があるのに signup 側は最小 fragment。新規 signup user の
 *   onboarding 摩擦を減らすため、覚えやすいパスフレーズ + 8 文字以上 + 再 signup 経路 を
 *   1 行で集約。
 *
 * fix (1 ファイル 1 行差分): hint テキスト 拡充 + iter887 comment 追加。
 *
 * 検証: source-side regex assert + iter886/885/884/851 invariant cross-check。
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
  if (
    /8 文字以上。覚えやすいパスフレーズ推奨 \(例: 単語複数 \+ 記号\)。忘れたら再サインアップ。/.test(
      sf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `signup-password-hint 拡充 OK (3 要素: 文字数 / パスフレーズ / 復旧経路)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `signup-password-hint 拡充 未統合`,
    })
  }
  // 旧 minimal 文言が残っていないこと
  if (/<p id="signup-password-hint"[^>]*>\s*8 文字以上\s*<\/p>/.test(sf)) {
    findings.push({
      level: 'warning',
      message: `旧 minimal 「8 文字以上」 only hint が残存`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `旧 minimal hint 削除 OK`,
    })
  }

  // iter886 invariant
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">再<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter886 invariant: WorkflowRunHistory 再 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter886 invariant: 破壊` })
  }

  // iter885 invariant
  const lp = readFileSync(resolve(process.cwd(), 'src/app/(auth)/login/page.tsx'), 'utf8')
  if (/<span aria-hidden="true">サインアップ<\/span>/.test(lp)) {
    findings.push({
      level: 'info',
      message: `iter885 invariant: login page CardFooter 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter885 invariant: 破壊` })
  }

  // iter851 invariant
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: skip-link focus min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  console.log(`\n=== Findings (signup-password-hint-extension-iter887) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
