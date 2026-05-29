/**
 * Phase 6.15 loop iter1437 (mode-F = Flicker detection): archive / unarchive 楽観 update。
 *
 * Bug: `useArchiveItem` / `useUnarchiveItem` (src/features/item/hooks.ts) は
 * `onSuccess` で invalidateQueries するのみで `onMutate` の楽観 update を持たない。
 * これにより:
 *   - /archive で「アーカイブ復元」 → mutation 開始 → API ~200ms 待 → 復元成功 →
 *     dialog 閉じ → list refetch ~200ms → 漸く item が /archive から消える
 *   - dashboard / taskchute で archive → 同じく ~400-700ms の間、元 list に item が残る
 * 計 ~400-700ms の flicker (= 元 list に item が残って見える)。
 *
 * 修正: archiveMutationConfig helper で `onMutate` / `onError` / `onSettled` を共通化、
 * setQueryData を `void qc.cancelQueries(...)` (await せず) で sync 走らせ「drop と
 * 同 frame で archivedAt 反映」 を実現。useReorderItem iter437 / useToggleCompleteItem
 * iter1013 と同 pattern。archive=true / false で archivedAt: new Date()/null を分岐。
 *
 * 経路 B: source-side regex assert + iter437 / iter1013 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-archive-unarchive-iter1437.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(resolve(process.cwd(), 'src/features/item/hooks.ts'), 'utf8')

  // archiveMutationConfig helper の存在確認
  if (!src.includes('function archiveMutationConfig(workspaceId: string, archived: boolean)')) {
    findings.push({
      level: 'error',
      message: 'hooks.ts: archiveMutationConfig helper 不在',
    })
  }
  // useArchiveItem が helper を使用
  if (!src.includes('...archiveMutationConfig(workspaceId, true)(qc),')) {
    findings.push({
      level: 'error',
      message: 'hooks.ts: useArchiveItem が archiveMutationConfig(true) を spread 適用していない',
    })
  }
  // useUnarchiveItem が helper を使用
  if (!src.includes('...archiveMutationConfig(workspaceId, false)(qc),')) {
    findings.push({
      level: 'error',
      message:
        'hooks.ts: useUnarchiveItem が archiveMutationConfig(false) を spread 適用していない',
    })
  }
  // helper 内 fire-and-forget pattern (void qc.cancelQueries 必須、await 禁止 = await でない void 文)
  if (!src.includes('void qc.cancelQueries({ queryKey: [...itemKeys.all, workspaceId] })')) {
    findings.push({
      level: 'error',
      message:
        'hooks.ts: archive helper の cancelQueries が fire-and-forget でない (await すると flicker 再発)',
    })
  }
  // iter437 useReorderItem invariant
  if (!src.includes('export function useReorderItem(workspaceId: string)')) {
    findings.push({
      level: 'error',
      message: 'hooks.ts: iter437 useReorderItem 喪失',
    })
  }
  // iter1013 useToggleCompleteItem invariant
  if (!src.includes('export function useToggleCompleteItem(workspaceId: string)')) {
    findings.push({
      level: 'error',
      message: 'hooks.ts: iter1013 useToggleCompleteItem 喪失',
    })
  }

  console.log(`\n=== Findings (iter1437 archive/unarchive flicker fix) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — archiveMutationConfig + use{Archive,Unarchive}Item 楽観 update + iter437/1013 invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
