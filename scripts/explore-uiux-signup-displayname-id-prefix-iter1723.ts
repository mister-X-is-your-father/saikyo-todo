/**
 * Phase 6.15 loop iter1723: signup-form の displayName-hint / displayName-error の id prefix
 * を sibling email/password (`signup-email-hint` / `signup-password-error` 等) と揃え
 * `signup-` prefix で統一 (= iter1715 login-form prefix sweep の signup 側 counterpart)。
 *
 * 発見した internal divergence:
 *   - signup-form の email field: hint id="signup-email-hint" / error id="signup-email-error"
 *   - signup-form の password field: hint id="signup-password-hint" / error id="signup-password-error"
 *   - signup-form の displayName field (旧): hint id="displayName-hint" / error id="displayName-error"
 *     → 同一 form 内 hint/error id の prefix convention が divergent
 *     → field id="displayName" は form.register('displayName') と一致のため不変、auxiliary
 *       hint/error id のみ `signup-` prefix で統一可能
 *
 * 影響: 単独 page では衝突しないが、将来 signup-form を modal/popover 内に embed する際、
 *   近傍 component が `id="displayName-hint"` (例: workspace member 編集 form の displayName)
 *   を持つと collision で SR が誤った要素を describe。defensive な id namespacing で予防 +
 *   sibling email/password と命名 pattern が完全に揃う。
 *
 * 修正 (src/components/auth/signup-form.tsx, 4 line 差替 + 5 line comment):
 *   - `id="displayName-hint"` → `id="signup-displayName-hint"`
 *   - `id="displayName-error"` → `id="signup-displayName-error"`
 *   - aria-describedby `'displayName-hint displayName-error'` →
 *     `'signup-displayName-hint signup-displayName-error'`
 *   - aria-describedby `'displayName-hint'` → `'signup-displayName-hint'`
 *   - field id="displayName" 自体は form.register('displayName') と一致のため camelCase 維持
 *   - iter1715 login-form と同じ sweep の signup 側 counterpart
 *
 * 副次更新: iter735 codify script の hint / aria-describedby regex を新 id 文字列に追従。
 *   iter736-739 race invariant scripts も似た check を持つが、それらは元から他理由
 *   (text 変更等) で warning 発生しており本 sweep の責任範囲外、必要に応じて別 iter 更新。
 *
 * 実行: pnpm tsx scripts/explore-uiux-signup-displayname-id-prefix-iter1723.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))

  const signupForm = readFileSync(resolve(here, '../src/components/auth/signup-form.tsx'), 'utf8')

  // --- 1. 新 id="signup-displayName-hint" 存在 ---
  if (!signupForm.includes('id="signup-displayName-hint"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'signup-form.tsx に id="signup-displayName-hint" が無い',
    })
  }

  // --- 2. 新 id="signup-displayName-error" 存在 ---
  if (!signupForm.includes('id="signup-displayName-error"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'signup-form.tsx に id="signup-displayName-error" が無い',
    })
  }

  // --- 3. aria-describedby が新 ref 文字列に揃っている ---
  if (!signupForm.includes("'signup-displayName-hint signup-displayName-error'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'signup-form.tsx aria-describedby displayName error path が新 ref に未追従',
    })
  }
  if (!signupForm.includes("'signup-displayName-hint'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'signup-form.tsx aria-describedby displayName hint-only path が新 ref に未追従',
    })
  }

  // --- 4. 旧 bare id "displayName-hint" / "displayName-error" は撤去済 ---
  //   substring match に注意: 新 id "signup-displayName-hint" は "displayName-hint" を
  //   substring として含むため、aria-describedby 文字列単位の存在で旧 path をチェック。
  if (signupForm.includes("'displayName-hint displayName-error'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'signup-form.tsx に旧 aria-describedby path "displayName-hint displayName-error" が残存',
    })
  }
  if (signupForm.match(/['"]displayName-hint['"]/)) {
    // 新 path に `signup-` prefix が入る前提で、bare `displayName-hint` 単独 string は撤去
    // 注: 新 path `'signup-displayName-hint'` は substring `'displayName-hint'` を含むが、
    //     literal `'displayName-hint'` (quote 直前 quote 直後 single hint) は新 path に無い。
    //     regex は quote 直前直後で boundary を確保。
    findings.push({
      level: 'error',
      source: 'a11y',
      message: "signup-form.tsx に旧 bare aria-describedby path 'displayName-hint' が残存",
    })
  }

  // --- 5. field id="displayName" は不変 (form.register('displayName') 同期維持) ---
  if (!signupForm.includes('id="displayName"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'signup-form.tsx の field id="displayName" が消えている (form register 同期破壊)',
    })
  }

  // --- 6. sibling email/password id prefix 不変 (回帰 guard) ---
  if (
    !signupForm.includes('id="signup-email-error"') ||
    !signupForm.includes('id="signup-password-error"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'signup-form.tsx の signup-email-error / signup-password-error id が消えている',
    })
  }

  // --- 7. iter1715 reference invariant: login-form login-*-error id 維持 ---
  const loginForm = readFileSync(resolve(here, '../src/components/auth/login-form.tsx'), 'utf8')
  if (
    !loginForm.includes('id="login-email-error"') ||
    !loginForm.includes('id="login-password-error"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1715 login-form の login-*-error id が消えている',
    })
  }

  // --- 8. iter1722 reference invariant: mock-top-nav session ID truncate 維持 ---
  const mockTopNav = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )
  if (!mockTopNav.includes('{sessionId.slice(0, 8)}…')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1722 mock-top-nav の sessionId.slice(0, 8)… truncate が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — signup-form displayName-hint/error id が `signup-` prefix で全 form 内統一、iter1715 / iter1722 invariant 不変',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
