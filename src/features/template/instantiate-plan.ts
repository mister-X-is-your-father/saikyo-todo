/**
 * Template 展開の純粋ロジック: Mustache 変数展開 + template_items ツリーから
 * 実 items の insert plan を作る。DB 非依存なので unit test 可能。
 *
 * 出力した plan を service 層が 1 トランザクションで insert していく。
 */
import Mustache from 'mustache'
import { randomUUID } from 'node:crypto'

import { uuidToLabel } from '@/lib/db/ltree-path'

export interface PlanItemInsert {
  id: string
  title: string
  description: string
  parentPath: string // ltree (空 = root)
  status: string
  dueDate: string | null // 'YYYY-MM-DD'
  isMust: boolean
  dod: string | null
  agentRoleToInvoke: string | null
  defaultAssignees: Array<Record<string, unknown>>
}

export interface InstantiationPlan {
  rootItem: PlanItemInsert
  children: PlanItemInsert[]
}

export interface TemplateInstantiationSource {
  template: { name: string }
  templateItems: Array<{
    id: string
    title: string
    description: string
    parentPath: string
    statusInitial: string
    dueOffsetDays: number | null
    isMust: boolean
    dod: string | null
    agentRoleToInvoke: string | null
    defaultAssignees: unknown
  }>
  variables: Record<string, unknown>
  today: Date
  rootTitleOverride?: string | null
  idFactory?: () => string
}

function renderMustache(tpl: string, vars: Record<string, unknown>): string {
  // HTML escape を OFF (タイトル / 本文用途、{{{...}}} を書かなくて済むように)
  return Mustache.render(tpl, vars, {}, { escape: (v) => String(v) })
}

function addDaysISO(base: Date, days: number): string {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function coerceAssignees(v: unknown): Array<Record<string, unknown>> {
  return Array.isArray(v) ? (v as Array<Record<string, unknown>>) : []
}

/**
 * template_items の parent_path (template 世界の ltree) を、実 items 世界の
 * parent_path に翻訳する。各 template_item 1 つずつに新 uuid を割り当て、
 * ラベル対応表を作って翻訳する。
 */
export function buildInstantiationPlan(src: TemplateInstantiationSource): InstantiationPlan {
  const mkId = src.idFactory ?? (() => randomUUID())
  const rootId = mkId()
  const rootLabel = uuidToLabel(rootId)
  const rootTitle = renderMustache(src.rootTitleOverride ?? src.template.name, src.variables)
  const rootItem: PlanItemInsert = {
    id: rootId,
    title: rootTitle,
    description: '',
    parentPath: '',
    status: 'todo',
    dueDate: null,
    isMust: false,
    dod: null,
    agentRoleToInvoke: null,
    defaultAssignees: [],
  }

  // parent_path の深さ (nlevel) 昇順で処理して、親が先に決まるようにする。
  const sorted = [...src.templateItems].sort((a, b) => {
    const da = a.parentPath === '' ? 0 : a.parentPath.split('.').length
    const db = b.parentPath === '' ? 0 : b.parentPath.split('.').length
    return da - db
  })

  // template_item の uuid-label → 実 item の uuid-label マップ
  const labelMap = new Map<string, string>()
  const children: PlanItemInsert[] = []

  for (const ti of sorted) {
    const newId = mkId()
    const newLabel = uuidToLabel(newId)
    labelMap.set(uuidToLabel(ti.id), newLabel)

    // parent_path 翻訳: 空 なら root の下 (rootLabel)。
    // そうでなければ 各 label を labelMap で置換して root label を prefix。
    let newParentPath: string
    if (ti.parentPath === '') {
      newParentPath = rootLabel
    } else {
      const translated = ti.parentPath
        .split('.')
        .map((lbl) => {
          const mapped = labelMap.get(lbl)
          if (!mapped) {
            // 親が先に sort されている前提。ここに来たら template 内の孤児 labelなので stop.
            throw new Error(
              `template_item parent label not found: ${lbl} (parent 未登録? ordering バグ)`,
            )
          }
          return mapped
        })
        .join('.')
      newParentPath = `${rootLabel}.${translated}`
    }

    const due = ti.dueOffsetDays != null ? addDaysISO(src.today, ti.dueOffsetDays) : null

    children.push({
      id: newId,
      title: renderMustache(ti.title, src.variables),
      description: renderMustache(ti.description, src.variables),
      parentPath: newParentPath,
      status: ti.statusInitial,
      dueDate: due,
      isMust: ti.isMust,
      dod: ti.dod ? renderMustache(ti.dod, src.variables) : null,
      agentRoleToInvoke: ti.agentRoleToInvoke,
      defaultAssignees: coerceAssignees(ti.defaultAssignees),
    })
  }

  return { rootItem, children }
}
