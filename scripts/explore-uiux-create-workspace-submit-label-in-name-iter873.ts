/**
 * Phase 6.15 loop iter 873 (mode-D Desktop a11y) —
 * create-workspace-form submit button: WCAG 2.5.3 (Label in Name) prefix 適合。
 *
 * 課題: src/components/workspace/create-workspace-form.tsx の create-workspace-submit:
 *   - visible: "作成" / "作成中..." (iter847 で aria-hidden 維持済み)
 *   - 旧 aria-label: "Workspace を新規作成" / "Workspace を作成中…"
 *   - 問題:
 *     1. visible "作成" は aria-label suffix substring (prefix 不一致) → voice user
 *        発話「作成」と name 先頭不一致 → WCAG 2.5.3 推奨形に未到達
 *     2. visible "作成中..." (ascii 3 dots) と aria-label "作成中…" (single ellipsis
 *        char U+2026) で character 不一致 → label-in-name 厳密違反
 *   iter844-872 で同 pattern 順次適合化済、本 form のみ並走未対応で残る。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-label を visible text prefix 形に変更:
 *     - 通常: 「作成 (Workspace を新規作成)」
 *     - pending: 「作成中... (Workspace を作成中)」 ← visible "作成中..." と ASCII dots 統一
 *   - visible は iter847 で aria-hidden 維持、aria-label の prefix 化のみで適合化
 *     (iter844-872 と一貫、login/signup/sprint と並走整合)。
 *
 * 検証: source-side regex assert + iter844/845/847/871/872 invariant cross-check。
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

  // 1. aria-label prefix
  if (
    /aria-label=\{isPending \? '作成中\.\.\. \(Workspace を作成中\)' : '作成 \(Workspace を新規作成\)'\}/.test(
      cwf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `create-workspace-submit aria-label visible "作成" / "作成中..." prefix OK (char 一致)`,
    })
  } else {
    findings.push({ level: 'warning', message: `create-workspace-submit aria-label NG` })
  }

  // 2. iter847 invariant: visible aria-hidden 維持
  if (/<span aria-hidden="true">\{isPending \? '作成中\.\.\.' : '作成'\}<\/span>/.test(cwf)) {
    findings.push({
      level: 'info',
      message: `iter847 invariant: create-workspace-submit visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter847 invariant: 破壊` })
  }

  // 3. data-testid 維持
  if (/data-testid="create-workspace-submit"/.test(cwf)) {
    findings.push({
      level: 'info',
      message: `create-workspace-submit data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `create-workspace-submit data-testid 破壊` })
  }

  // iter872 invariant: signup-submit
  const sf = readFileSync(resolve(process.cwd(), 'src/components/auth/signup-form.tsx'), 'utf8')
  if (/aria-label=\{[\s\S]+?'サインアップ \(アカウントを新規作成\)'/.test(sf)) {
    findings.push({
      level: 'info',
      message: `iter872 invariant: signup-submit aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter872 invariant: 破壊` })
  }

  // iter844 invariant: login-submit
  const lf = readFileSync(resolve(process.cwd(), 'src/components/auth/login-form.tsx'), 'utf8')
  if (/aria-label=\{[\s\S]+?'ログイン \(メール \+ パスワードで認証\)'/.test(lf)) {
    findings.push({
      level: 'info',
      message: `iter844 invariant: login-submit aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter844 invariant: 破壊` })
  }

  // iter871 invariant: sprint-period-save
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{[\s\S]+?`保存 \(Sprint「\$\{sprint\.name\}」の期間を保存\)`/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter871 invariant: sprint-period-save aria-label prefix 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter871 invariant: 破壊` })
  }

  // iter850 invariant: bulk-delete
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">削除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete "削除" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: 破壊` })
  }

  console.log(`\n=== Findings (create-workspace-submit-label-in-name-iter873) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
