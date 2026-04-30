/**
 * 既存 Item ツリー (parent + descendants) から Template Blueprint を構築する pure helper。
 *
 * 「ItemEditDialog から『この Item と subtask を Template に保存』」 (FEEDBACK_QUEUE
 * P0 Template 登録機能 scope A) の substrate。Service / UI から DB 非依存に呼べる
 * ように DB / requireUser に触れない。
 *
 * 反対方向 (Template → Item) の展開は `instantiate-plan.ts` 参照。本 helper は
 * その逆: items 世界の uuid label を template 世界の uuid label に再 mapping し、
 * parent の prefix を剥がして root-relative な template_items.parent_path を作る。
 *
 * MVP では position / due_date / agent_role / tags / assignees は保持しない (= scope A)。
 * scope B 以降で due_offset_days / agent_role_to_invoke / defaultAssignees を追加。
 */
import { randomUUID } from 'node:crypto'

import { fullPathOf, uuidToLabel } from '@/lib/db/ltree-path'

export interface BlueprintItemSource {
  id: string
  title: string
  description: string
  parentPath: string
  statusInitial: string
  isMust: boolean
  dod: string | null
}

export interface BlueprintParentSource {
  id: string
  title: string
  description: string
  parentPath: string
}

export interface TemplateBlueprintItem {
  id: string
  title: string
  description: string
  parentPath: string
  statusInitial: string
  isMust: boolean
  dod: string | null
}

export interface TemplateBlueprint {
  template: { name: string; description: string }
  templateItems: TemplateBlueprintItem[]
}

export interface BuildTemplateBlueprintInput {
  parent: BlueprintParentSource
  descendants: BlueprintItemSource[]
  idFactory?: () => string
}

/**
 * 仕様:
 *   - template.name = parent.title
 *   - template.description = parent.description
 *   - 各 descendant の parentPath は parent のフル path で必ず始まる必要がある
 *     (= 真の子孫)。そうでない要素はスキップ (silently drop)。
 *   - depth (parent path の `.` 区切り長さ) 昇順でソートし、親が先に label map に
 *     入るよう走査する。同 depth 内の安定順は入力順を維持。
 *   - parent の prefix を剥がした残りを labelMap で再翻訳して template_items.parent_path に。
 *     直下子の parentPath は '' (template world での root 直下)。
 *   - 1 つでも親 label が labelMap に未登録なら順序違反として throw (= 入力 ordering バグ)。
 *
 * 入出力ともに pure。idFactory を渡すと test で deterministic に。
 */
export function buildTemplateBlueprintFromItemTree(
  input: BuildTemplateBlueprintInput,
): TemplateBlueprint {
  const mkId = input.idFactory ?? (() => randomUUID())
  const parentFull = fullPathOf(input.parent)

  const inOrder = input.descendants
    .map((d, originalIndex) => ({ d, originalIndex }))
    .filter(({ d }) => isUnderParentFull(d.parentPath, parentFull))

  const sorted = inOrder.sort((a, b) => {
    const da = depthOf(a.d.parentPath)
    const db = depthOf(b.d.parentPath)
    if (da !== db) return da - db
    return a.originalIndex - b.originalIndex
  })

  const labelMap = new Map<string, string>()
  const templateItems: TemplateBlueprintItem[] = []

  for (const { d } of sorted) {
    const newId = mkId()
    const newLabel = uuidToLabel(newId)
    labelMap.set(uuidToLabel(d.id), newLabel)

    const relative = stripPrefix(d.parentPath, parentFull)
    const newParentPath = relative === '' ? '' : translateLabels(relative, labelMap)

    templateItems.push({
      id: newId,
      title: d.title,
      description: d.description,
      parentPath: newParentPath,
      statusInitial: d.statusInitial,
      isMust: d.isMust,
      dod: d.dod,
    })
  }

  return {
    template: { name: input.parent.title, description: input.parent.description },
    templateItems,
  }
}

function isUnderParentFull(itemParentPath: string, parentFull: string): boolean {
  return itemParentPath === parentFull || itemParentPath.startsWith(`${parentFull}.`)
}

function depthOf(parentPath: string): number {
  return parentPath === '' ? 0 : parentPath.split('.').length
}

function stripPrefix(itemParentPath: string, parentFull: string): string {
  if (itemParentPath === parentFull) return ''
  // ここに来た時点で必ず parentFull + '.' で始まる (caller でフィルタ済)
  return itemParentPath.slice(parentFull.length + 1)
}

function translateLabels(path: string, labelMap: Map<string, string>): string {
  return path
    .split('.')
    .map((lbl) => {
      const mapped = labelMap.get(lbl)
      if (!mapped) {
        throw new Error(
          `template blueprint label not found: ${lbl} (descendants の depth ordering バグ?)`,
        )
      }
      return mapped
    })
    .join('.')
}
