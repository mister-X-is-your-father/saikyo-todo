/**
 * Phase 6.15 loop iter 596 (mode-D Desktop a11y) —
 * integrations-panel src-method <select> 動的 aria-label + 効果説明補強。
 *
 * 課題: integrations-panel.tsx 行 401-410 の src-method <select> は aria-label が
 *   "HTTP メソッド (GET / POST)" の static で current value (GET/POST) が aria
 *   側で expose されない (browser native announce のみ)。さらに HTTP method の
 *   semantic 差 (副作用有無 / body の有無) が visible/AT で読み取り辛い。
 *
 * fix (1 ファイル ~9 行差分):
 *   - aria-label 動的 template literal 化 + 効果説明補強
 *     - 'GET' → 'GET — 副作用なし、URL の query で読取り'
 *     - 'POST' → 'POST — body 付き送信、subscribe / search 系の API に使う'
 *     - 未知 → raw fallback で破綻防止
 *
 * iter587-595 (動的 aria-label expose / i18n 整合) pattern を src-method に
 * 水平展開、HTTP method semantic を SR で 1 phrase で確認可能。
 *
 * 検証: source-side regex assert + iter515-595 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )

  // 1. method 'GET' → 'GET — 副作用なし、URL の query で読取り'
  if (/method === 'GET'\s*\n?\s*\?\s*'GET — 副作用なし、URL の query で読取り'/.test(ip)) {
    findings.push({ level: 'info', message: `method 'GET' → 効果説明 OK` })
  } else {
    findings.push({ level: 'warning', message: `method 'GET' 変換なし` })
  }

  // 2. method 'POST' → 'POST — body 付き送信、subscribe / search 系の API に使う'
  if (
    /method === 'POST'\s*\n?\s*\?\s*'POST — body 付き送信、subscribe \/ search 系の API に使う'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `method 'POST' → 効果説明 OK` })
  } else {
    findings.push({ level: 'warning', message: `method 'POST' 変換なし` })
  }

  // 3. aria-label 動的 template literal
  if (/aria-label=\{`HTTP メソッド \(現在: \$\{/.test(ip)) {
    findings.push({ level: 'info', message: `aria-label 動的 template literal OK` })
  } else {
    findings.push({ level: 'warning', message: `aria-label 動的化なし` })
  }

  // 4. iter595 invariant: src-kind aria-label 維持
  if (/aria-label=\{`Source 種別 \(現在: \$\{/.test(ip)) {
    findings.push({ level: 'info', message: `iter595 invariant: src-kind 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter595 invariant: 破壊` })
  }

  // 5. iter594 invariant: dep-target option statusJa 維持
  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (/const statusJa = getStatusVisual\(c\.status\)\.shortLabel/.test(idp)) {
    findings.push({ level: 'info', message: `iter594 invariant: dep-target statusJa 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter594 invariant: 破壊` })
  }

  // 6. iter592 invariant: goals mode aria-label 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`KR 進捗算出モード \(現在: \$\{/.test(gp)) {
    findings.push({ level: 'info', message: `iter592 invariant: goals mode 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter592 invariant: 破壊` })
  }

  console.log(`\n=== Findings (http-method-aria-iter596) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
