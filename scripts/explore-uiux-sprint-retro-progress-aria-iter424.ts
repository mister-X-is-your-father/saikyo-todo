/**
 * Phase 6.15 loop iter 424 (mode-D Desktop a11y) — SprintRetroWidget の
 * 完了率 progress bar が severity (ok/info/warn/danger) を **fill 色のみ** で
 * 伝えていた問題を修正、codify。
 *
 * 課題: src/components/sprint/sprint-retro-widget.tsx の進捗 bar:
 *   ```tsx
 *   <div role="progressbar"
 *        aria-valuenow={rate}
 *        aria-label={`完了率 ${rate}%`}>
 *     <div className={sev === 'ok' ? 'bg-emerald-500' : ...} />
 *   </div>
 *   ```
 *   SR は「完了率 75%」と数値だけ聞き取り、severity (= 順調 / 注意 / 要対策)
 *   が fill 色のみで伝わる → WCAG 1.4.1 違反 / SR ユーザは「この率は OK か?」
 *   判断不能。
 *
 * fix: 1 ファイル ~10 行差分。
 *   - `severityLabelJa(sev)` helper 追加 (ok=順調 / info=良好 / warn=注意 /
 *     danger=要対策 の 4 段階日本語ラベル)
 *   - progressbar に `aria-valuetext` で「{rate}% ({sevLabel})」を追加 → SR は
 *     「完了率: 75% (順調)」と severity 文字を聞き取れる
 *   - aria-label を簡潔化 ("完了率") して valuetext と役割分担
 *
 * 機能追加なし、視覚 layout / 色 / 数値表示 全て不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。runtime test (Sprint widget 描画)
 *   は workspace + sprint + items seed 必要なため省略。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/sprint/sprint-retro-widget.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. severityLabelJa helper 4 ラベル
  for (const label of ['順調', '良好', '注意', '要対策']) {
    if (src.includes(`return '${label}'`) || src.includes(`'${label}'`)) {
      findings.push({ level: 'info', message: `${path}: severityLabelJa "${label}" OK` })
    } else {
      findings.push({ level: 'warning', message: `${path}: severityLabelJa "${label}" 不在` })
    }
  }

  // 2. progressbar aria-valuetext 配線 (severityLabelJa の戻り値 + rate を組合せ)
  if (
    /aria-valuetext=\{`\$\{summary\.completionRate\}% \(\$\{severityLabelJa\(sev\)\}\)`\}/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: progressbar aria-valuetext (rate% + severity) OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: aria-valuetext 配線 不在` })
  }

  // 3. aria-label 簡潔化 ("完了率" のみ、数値は valuetext に分離)
  if (/aria-label="完了率"/.test(src) && !/aria-label=\{`完了率 /.test(src)) {
    findings.push({ level: 'info', message: `${path}: aria-label 簡潔化 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: aria-label 簡潔化 不在` })
  }

  // 4. progressbar 既存属性 維持 (aria-valuenow / aria-valuemin / aria-valuemax)
  if (
    /aria-valuenow=\{summary\.completionRate\}/.test(src) &&
    /aria-valuemin=\{0\}/.test(src) &&
    /aria-valuemax=\{100\}/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: progressbar 既存 ARIA 属性 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: progressbar 既存 ARIA 属性が消えた` })
  }

  console.log(`\n=== Findings (sprint-retro-progress-aria-iter424) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
