/**
 * Phase 6.15 loop iter 384 — `ArchivedItemsPanel` の date cells に
 * `<time dateTime>` semantic 強化 (iter380 で mock-entries に適用した pattern を
 * workspace 配下の archive 一覧にも展開)。
 *
 * 課題: src/components/workspace/archived-items-panel.tsx の date cells は
 *   `fmt(item.dueDate)` / `fmt(item.archivedAt)` で plain string を直接 td 内に
 *   出力していた。`<time>` 不在で
 *   - SR は時刻読み上げが numeric として不自然
 *   - 機械可読データとして識別されない (browser reader mode / scraper 等への hint
 *     なし)
 *   - WCAG 1.3.1 Info and Relationships の semantic gap
 *
 * fix: src/components/workspace/archived-items-panel.tsx に小さな
 *   `FmtTime` component を追加 (約 10 line) し、date cells を
 *   `<FmtTime value={item.dueDate} />` / `<FmtTime value={item.archivedAt} />` に
 *   置換。FmtTime は valid Date のみ `<time dateTime={ISO}>{表示}</time>` を返し、
 *   null/invalid は plain '-' を fragment で返す (dateTime 必須属性回避)。
 *   既存 `fmt()` 関数は他箇所で参照していないが残置 (後の caller がいた場合の備え)。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル (約 16 line 差替)。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/workspace/archived-items-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. FmtTime component が存在し <time dateTime={d.toISOString()}> を出す
  if (
    !/function FmtTime\(\{ value \}: \{ value: Date \| string \| null \| undefined \}\)/.test(src)
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: FmtTime component が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'FmtTime component OK' })
  }
  if (
    !/<time dateTime=\{d\.toISOString\(\)\}>\{format\(d, 'yyyy-MM-dd HH:mm'\)\}<\/time>/.test(src)
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: FmtTime が <time dateTime>{format} を出していない`,
    })
  }

  // 2. date cells が <FmtTime /> を使っている (2 箇所)
  const fmtTimeMatches = src.match(/<FmtTime value=\{item\.(dueDate|archivedAt)\}/g) ?? []
  if (fmtTimeMatches.length < 2) {
    findings.push({
      level: 'warning',
      message: `${target}: <FmtTime> による date cell wrap が ${fmtTimeMatches.length}/2 個しか無い`,
    })
  } else {
    findings.push({ level: 'info', message: `<FmtTime> wrap = ${fmtTimeMatches.length}/2 OK` })
  }

  // 3. 旧 plain `{fmt(item.dueDate)}` / `{fmt(item.archivedAt)}` が td 内に
  //    残っていない (regression chk: jsx 内の fmt direct call が消えた)
  if (/<td[^>]*>\{fmt\(item\.(dueDate|archivedAt)\)\}<\/td>/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: 旧 {fmt(item.X)} の plain 呼び出しが td 内に残っている`,
    })
  }

  // 4. iter378-383 invariant 維持 (regression guard)
  for (const f of [
    'src/components/mock-timesheet/mock-login-form.tsx',
    'src/components/mock-timesheet/mock-submit-form.tsx',
    'src/components/mock-timesheet/mock-top-nav.tsx',
    'src/components/shared/keybindings-help-modal.tsx',
    'src/components/workflow/workflows-panel.tsx',
  ]) {
    const s = readFileSync(resolve(process.cwd(), f), 'utf8')
    if (
      f.endsWith('mock-top-nav.tsx') &&
      !/<nav\s+aria-label="mock-timesheet ナビゲーション"/.test(s)
    ) {
      findings.push({ level: 'warning', message: `${f}: iter381 nav landmark が消えた` })
    }
    if (
      f.endsWith('keybindings-help-modal.tsx') &&
      (!/aria-labelledby=\{headingId\}/.test(s) ||
        !/aria-label=\{`ショートカット \$\{kb\.combo\}`\}/.test(s))
    ) {
      findings.push({ level: 'warning', message: `${f}: iter382 section/dt a11y pattern が消えた` })
    }
    if (
      f.endsWith('workflows-panel.tsx') &&
      !/id=\{`wf-editor-error-\$\{wf\.id\}`\}[\s\S]*?role="alert"/.test(s)
    ) {
      findings.push({ level: 'warning', message: `${f}: iter383 inline error role=alert が消えた` })
    }
    if (
      (f.endsWith('mock-login-form.tsx') || f.endsWith('mock-submit-form.tsx')) &&
      (!/function onInvalid\(errors:/.test(s) || !/handleSubmit\(onSubmit, onInvalid\)/.test(s))
    ) {
      findings.push({ level: 'warning', message: `${f}: iter378/379 onInvalid pattern が消えた` })
    }
  }

  // 5. archive panel 自身の iter383 invariant (role=alert) 維持
  if (!/className="text-destructive p-4 text-sm" role="alert"/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: iter383 で追加した role="alert" が消えた`,
    })
  }

  console.log(`\n=== Findings (archive-time-iter384) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
