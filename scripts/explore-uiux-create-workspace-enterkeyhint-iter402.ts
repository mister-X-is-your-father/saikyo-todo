/**
 * Phase 6.15 loop iter 402 — CreateWorkspaceForm の name → slug field に
 * `enterKeyHint` を追加 (iter401 pattern を /workspace 初回 onboarding form に
 * 水平展開)。
 *
 * 課題: src/components/workspace/create-workspace-form.tsx は (a) name field
 *   に enterKeyHint なし → mobile virtual keyboard で「次の field」を促す
 *   label が出ず、(b) slug field (最終 input) に enterKeyHint なし → submit
 *   trigger を促す "送信" / "send" label が出ない。iter401 で auth form
 *   (login / signup) には enterKeyHint pattern (next / next / send) を適用済
 *   だが、初回 onboarding form は未適用で UX 断絶。
 *
 * fix: 1 file × 2 input に enterKeyHint を追加 (2 line)。
 *   - name IMEInput: `enterKeyHint="next"` (slug field へ移動を示唆)
 *   - slug IMEInput: `enterKeyHint="send"` (最終 field、送信を示唆)
 *   これで mobile keyboard label が name="次へ" → slug="送信" の 2 段
 *   progression になり、auth form (login / signup) と同じ keyboard UX を
 *   workspace 初回 onboarding にも適用、user が auth → workspace 初回作成の
 *   一貫した form interaction を体験。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。desktop 動作は不変。
 *
 * 検証: source-side regex assert で codify (mobile keyboard 自体は cloud env
 *   integration test 不可、static audit で代替)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/create-workspace-form.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. name IMEInput has enterKeyHint="next"
  const nameBlock = src.match(/<IMEInput\s+id="name"[\s\S]*?\/>/)
  if (!nameBlock) {
    findings.push({ level: 'warning', message: `${path}: name IMEInput block 不在` })
  } else if (!/enterKeyHint="next"/.test(nameBlock[0])) {
    findings.push({
      level: 'warning',
      message: `${path}: name IMEInput に enterKeyHint="next" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'create-workspace name enterKeyHint="next" OK' })
  }

  // 2. slug IMEInput has enterKeyHint="send"
  const slugBlock = src.match(/<IMEInput\s+id="slug"[\s\S]*?\/>/)
  if (!slugBlock) {
    findings.push({ level: 'warning', message: `${path}: slug IMEInput block 不在` })
  } else if (!/enterKeyHint="send"/.test(slugBlock[0])) {
    findings.push({
      level: 'warning',
      message: `${path}: slug IMEInput に enterKeyHint="send" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'create-workspace slug enterKeyHint="send" OK' })
  }

  // iter377 invariant 維持: handleSubmit(onSubmit, onInvalid) wire up
  if (!/handleSubmit\(onSubmit,\s*onInvalid\)/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${path}: iter377 onInvalid wire up が消えた (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: 'iter377 onInvalid wire up 維持 OK' })
  }

  // iter343 invariant 維持: name field に autoComplete="off"
  if (!/<IMEInput\s+id="name"[\s\S]*?autoComplete="off"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${path}: iter343 name autoComplete="off" が消えた (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: 'iter343 name autoComplete="off" 維持 OK' })
  }

  // iter401 invariant 維持: login-form の email field に enterKeyHint="next"
  const loginPath = 'src/components/auth/login-form.tsx'
  const loginSrc = readFileSync(resolve(process.cwd(), loginPath), 'utf8')
  const loginEmailBlock = loginSrc.match(/<IMEInput\s+id="email"[\s\S]*?\/>/)
  if (!loginEmailBlock || !/enterKeyHint="next"/.test(loginEmailBlock[0])) {
    findings.push({
      level: 'warning',
      message: `${loginPath}: iter401 email enterKeyHint="next" が消えた (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: 'iter401 login email enterKeyHint 維持 OK' })
  }

  // iter401 invariant 維持: signup-form の displayName field に enterKeyHint="next"
  const signupPath = 'src/components/auth/signup-form.tsx'
  const signupSrc = readFileSync(resolve(process.cwd(), signupPath), 'utf8')
  const signupNameBlock = signupSrc.match(/<IMEInput\s+id="displayName"[\s\S]*?\/>/)
  if (!signupNameBlock || !/enterKeyHint="next"/.test(signupNameBlock[0])) {
    findings.push({
      level: 'warning',
      message: `${signupPath}: iter401 displayName enterKeyHint="next" が消えた (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: 'iter401 signup displayName enterKeyHint 維持 OK' })
  }

  console.log(`\n=== Findings (create-workspace-enterkeyhint-iter402) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
