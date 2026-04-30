/**
 * Phase 6.15 loop iter 438 (mode-D Desktop a11y) — TeamCapacityPanel の `<ul>`
 * member 一覧が aria-labelledby 不在で SR list navigation の context が欠落
 * していた問題を修正、codify (iter427 / iter428 / iter431 / iter432 と同 pattern
 * 連続水平展開 7 件目)。
 *
 * 課題: src/components/workspace/team-capacity-panel.tsx は section / summary は
 *   aria-label を持つが member list `<ul>` 自体に aria-label/aria-labelledby が
 *   無いため、SR ユーザは list nav で「list 2 items」と件数のみ聞き取り、
 *   context (= "チームメンバー 余裕時間 一覧") が伝わらない。
 *
 * fix: 1 ファイル ~3 行差分。
 *   - `<summary>` に `id="team-capacity-summary"` 追加
 *   - `<ul>` に `aria-labelledby="team-capacity-summary"` 配線
 *
 * これで SR は ul を「チームメンバー 余裕時間 (今日 / 今週) リスト N 件」と
 * 読み上げ可能。`<details>` disclosure の summary を referenceable にする
 * 王道 pattern。
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

  const path = 'src/components/workspace/team-capacity-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. summary に id="team-capacity-summary"
  if (/<summary\s+id="team-capacity-summary"/.test(src)) {
    findings.push({ level: 'info', message: `${path}: <summary id> 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: <summary id> 不在` })
  }

  // 2. ul aria-labelledby 配線
  if (/<ul[^>]*aria-labelledby="team-capacity-summary"/.test(src)) {
    findings.push({ level: 'info', message: `${path}: <ul> aria-labelledby 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: <ul> aria-labelledby 不在` })
  }

  // 3. section の aria-label "チームメンバー余裕時間 一覧" 維持 (regression detector)
  if (/<section[^>]*aria-label="チームメンバー余裕時間 一覧"/.test(src)) {
    findings.push({ level: 'info', message: `${path}: <section aria-label> 維持 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: <section aria-label> 消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (team-capacity-list-aria-iter438) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
