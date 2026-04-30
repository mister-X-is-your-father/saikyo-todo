/**
 * Phase 6.15 loop iter 401 — /login + /signup form の email/displayName field に
 * `enterKeyHint="next"` を追加 (mobile virtual keyboard UX polish)。
 *
 * 課題: src/components/auth/login-form.tsx + signup-form.tsx は最終 field
 *   (password) のみ `enterKeyHint="send"` を持ち、その手前の email /
 *   displayName field には enterKeyHint 不在。mobile (iOS / Android) の
 *   virtual keyboard は OS default で enter key の label が "go" / "search" /
 *   "送信" 等にバラつき、user は「次の field へ移動」したいのに submit が
 *   走るかのような misleading な keyboard label を受け取る (WCAG 3.2.4
 *   Consistent Identification 関連の UX gap)。
 *
 * fix: 2 file × 計 3 input に `enterKeyHint="next"` を追加 (3 line)。
 *   - login-form.tsx: email IMEInput
 *   - signup-form.tsx: displayName + email IMEInput
 *   これで mobile keyboard は明示的に「次の field へ」を促す "Next" / "次へ"
 *   button label を表示、最終 password field のみ "send" / "送信" になり
 *   form 全体で keyboard label progression が直感的になる。
 *
 * 機能追加なし、shadcn 編集なし、影響面 2 ファイル。desktop 動作は不変。
 *
 * 検証: source-side regex assert で codify (mobile keyboard 自体は cloud env
 *   integration test 不可なので static audit で代替)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const loginPath = 'src/components/auth/login-form.tsx'
  const signupPath = 'src/components/auth/signup-form.tsx'
  const loginSrc = readFileSync(resolve(process.cwd(), loginPath), 'utf8')
  const signupSrc = readFileSync(resolve(process.cwd(), signupPath), 'utf8')

  // 1. login-form email field has enterKeyHint="next"
  // email IMEInput block must contain enterKeyHint="next" before the closing /
  const loginEmailBlock = loginSrc.match(/<IMEInput\s+id="email"[\s\S]*?\/>/)
  if (!loginEmailBlock) {
    findings.push({ level: 'warning', message: `${loginPath}: email IMEInput block 不在` })
  } else if (!/enterKeyHint="next"/.test(loginEmailBlock[0])) {
    findings.push({
      level: 'warning',
      message: `${loginPath}: email IMEInput に enterKeyHint="next" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'login email enterKeyHint="next" OK' })
  }

  // 2. login-form password field still has enterKeyHint="send" (regression guard)
  const loginPwBlock = loginSrc.match(/<IMEInput\s+id="password"[\s\S]*?\/>/)
  if (!loginPwBlock || !/enterKeyHint="send"/.test(loginPwBlock[0])) {
    findings.push({
      level: 'warning',
      message: `${loginPath}: password の enterKeyHint="send" が消えた (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: 'login password enterKeyHint="send" 維持 OK' })
  }

  // 3. signup-form displayName field has enterKeyHint="next"
  const signupNameBlock = signupSrc.match(/<IMEInput\s+id="displayName"[\s\S]*?\/>/)
  if (!signupNameBlock) {
    findings.push({ level: 'warning', message: `${signupPath}: displayName IMEInput block 不在` })
  } else if (!/enterKeyHint="next"/.test(signupNameBlock[0])) {
    findings.push({
      level: 'warning',
      message: `${signupPath}: displayName IMEInput に enterKeyHint="next" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'signup displayName enterKeyHint="next" OK' })
  }

  // 4. signup-form email field has enterKeyHint="next"
  const signupEmailBlock = signupSrc.match(/<IMEInput\s+id="email"[\s\S]*?\/>/)
  if (!signupEmailBlock) {
    findings.push({ level: 'warning', message: `${signupPath}: email IMEInput block 不在` })
  } else if (!/enterKeyHint="next"/.test(signupEmailBlock[0])) {
    findings.push({
      level: 'warning',
      message: `${signupPath}: email IMEInput に enterKeyHint="next" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'signup email enterKeyHint="next" OK' })
  }

  // 5. signup-form password field still has enterKeyHint="send" (regression guard)
  const signupPwBlock = signupSrc.match(/<IMEInput\s+id="password"[\s\S]*?\/>/)
  if (!signupPwBlock || !/enterKeyHint="send"/.test(signupPwBlock[0])) {
    findings.push({
      level: 'warning',
      message: `${signupPath}: password の enterKeyHint="send" が消えた (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: 'signup password enterKeyHint="send" 維持 OK' })
  }

  // iter375 invariant 維持: 両 form に handleSubmit(onSubmit, onInvalid) wire up
  for (const [path, src] of [
    [loginPath, loginSrc],
    [signupPath, signupSrc],
  ] as const) {
    if (!/handleSubmit\(onSubmit,\s*onInvalid\)/.test(src)) {
      findings.push({
        level: 'warning',
        message: `${path}: iter375 onInvalid wire up が消えた (regression)`,
      })
    }
  }

  // iter255 invariant 維持: pending 時 button aria-label
  if (!/aria-label=\{isPending \? 'ログイン中… \(認証処理を実行中\)' : undefined\}/.test(loginSrc)) {
    findings.push({
      level: 'warning',
      message: `${loginPath}: iter255 pending aria-label が消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (auth-enterkeyhint-iter401) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
