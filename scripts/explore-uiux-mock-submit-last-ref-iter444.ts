/**
 * Phase 6.15 loop iter 444 (mode-D Desktop a11y) — MockSubmitForm の送信成功
 * 直後の last external_ref 表示を SR に届けるため `role="status" aria-live="polite"`
 * を追加、codify。
 *
 * 課題: src/components/mock-timesheet/mock-submit-form.tsx の line 144 付近:
 *   ```tsx
 *   {lastRef && (
 *     <p className="text-muted-foreground text-xs" data-external-ref={lastRef}>
 *       last external_ref: <code>{lastRef}</code>
 *     </p>
 *   )}
 *   ```
 *   送信成功時に表示される external_ref は toast.success (sonner) だけが SR に
 *   届く。toast 消えた後の permanent display は SR に再 announce されず、SR
 *   ユーザは「自分の送信が成功して external_ref が貯まっていく」 経過を辿りにくい。
 *
 * fix: 1 ファイル ~3 行差分 (コメント込み)。
 *   - `<p>` に `role="status" aria-live="polite"` を追加
 *   - lastRef state が変わるたび (= 新しい送信成功) SR に「last external_ref:
 *     {ref}」を 1 回 announce
 *
 * 機能追加なし、視覚 layout 不変、shadcn 編集なし。
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

  const path = 'src/components/mock-timesheet/mock-submit-form.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. role="status" + aria-live="polite" 配線 (data-testid="mock-last-ref")
  if (/data-testid="mock-last-ref"\s+role="status"\s+aria-live="polite"/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: <p mock-last-ref> role="status" + aria-live OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: <p mock-last-ref> role="status" + aria-live 不在`,
    })
  }

  // 2. iter405 invariant 維持: form aria-label="Mock Timesheet 工数送信フォーム"
  if (/aria-label="Mock Timesheet 工数送信フォーム"/.test(src)) {
    findings.push({
      level: 'info',
      message: `${path}: iter405 form landmark aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: iter405 form landmark aria-label 消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (mock-submit-last-ref-iter444) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
