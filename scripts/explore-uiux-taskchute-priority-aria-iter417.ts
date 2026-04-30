/**
 * Phase 6.15 loop iter 417 (mode-D Desktop a11y) — TaskChute view (iter519 で
 * 追加された方法論 mode の 1 列 timeline view) の priority chip に
 * `aria-label` 重複 prefix bug を発見、修正を codify。
 *
 * 課題: src/components/workspace/taskchute-view.tsx の priority chip span が
 *   ```tsx
 *   aria-label={`優先度 ${priorityLabel(item.priority)}`}
 *   ```
 *   と書かれており、`priorityLabel()` (`src/features/item/priority.ts`) は
 *   既に "優先度: 最優先 (p1)" 形式を返すため、SR は
 *   **「優先度 優先度: 最優先 (p1)」** と prefix 二重を読み上げてしまう。
 *   他 view (today / inbox / personal-period / command-palette) は
 *   いずれも `aria-label={priorityLabel(it.priority)}` で正しく単一 prefix。
 *   TaskChute だけが outlier。
 *
 *   さらに span が visible text に同じ priorityLabel を含むため SR が
 *   AT subtree も読む実装 (NVDA の一部設定) で重複読み上げになる。
 *
 * fix: 1 ファイル 2 行差分。
 *   - `aria-label`: 冗長 prefix `優先度 ` を削除し他 view と統一
 *     (`aria-label={priorityLabel(item.priority)}`)
 *   - `role="img"` 追加で children subtree を AT 上隠蔽 (iter98 PDCA bar
 *     と同 pattern: container role="img" + 集約 aria-label)
 *   visible text / 視覚 layout は不変、機能追加なし。
 *
 * 検証: source-side regex assert で codify (DB seed 不要)。
 *   - aria-label に "優先度 優先度" 重複 prefix が居ない
 *   - role="img" が priority chip に付与されている
 *   - 他 view (today / inbox / personal-period / command-palette) で
 *     `aria-label={priorityLabel(...)}` の単一 prefix pattern が維持されている
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const taskchutePath = 'src/components/workspace/taskchute-view.tsx'
  const taskchuteSrc = readFileSync(resolve(process.cwd(), taskchutePath), 'utf8')

  // 1. 重複 prefix 残存 check (regression detector)
  if (/aria-label=\{`優先度 \$\{priorityLabel\(/.test(taskchuteSrc)) {
    findings.push({
      level: 'error',
      message: `${taskchutePath}: aria-label="優先度 ${'${priorityLabel(...)}'}" 重複 prefix が再発`,
    })
  } else {
    findings.push({ level: 'info', message: `${taskchutePath}: 重複 prefix なし OK` })
  }

  // 2. role="img" + aria-label 単一 prefix が priority chip に付与されているか
  const priorityChipBlock = /role="img"\s+aria-label=\{priorityLabel\(item\.priority\)\}/m.test(
    taskchuteSrc,
  )
  if (priorityChipBlock) {
    findings.push({
      level: 'info',
      message: `${taskchutePath}: role="img" + 単一 prefix aria-label OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${taskchutePath}: priority chip の role="img" + 単一 prefix aria-label が見つからない`,
    })
  }

  // 3. 他 view の単一 prefix pattern が維持されているか (regression detector)
  const SINGLE_PREFIX_TARGETS: { path: string; label: string }[] = [
    { path: 'src/components/workspace/today-view.tsx', label: 'today' },
    { path: 'src/components/workspace/inbox-view.tsx', label: 'inbox' },
    { path: 'src/components/workspace/personal-period-view.tsx', label: 'personal-period' },
    { path: 'src/components/shared/command-palette.tsx', label: 'command-palette' },
  ]
  for (const t of SINGLE_PREFIX_TARGETS) {
    const s = readFileSync(resolve(process.cwd(), t.path), 'utf8')
    // it.priority (today/inbox/personal-period) または item.priority (command-palette) を許容
    if (/aria-label=\{priorityLabel\((?:it|item)\.priority\)\}/.test(s)) {
      findings.push({ level: 'info', message: `${t.label}: 単一 prefix pattern 維持 OK` })
    } else {
      findings.push({
        level: 'warning',
        message: `${t.label}: 単一 prefix pattern が消えた (regression)`,
      })
    }
  }

  console.log(`\n=== Findings (taskchute-priority-aria-iter417) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
