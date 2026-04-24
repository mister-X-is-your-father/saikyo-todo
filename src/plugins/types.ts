/**
 * プラグイン契約。新ビュー / フィールド / アクション / Agent を増やすには
 * この型を実装して `src/plugins/core/<kind>/` に置き、`core/index.ts` で register する。
 *
 * ARCHITECTURE.md §6 プラグイン契約 参照。
 */
import type { ReactNode } from 'react'

import type { z } from 'zod'

import type { Item } from '@/features/item/schema'

/** Kanban / Gantt / Backlog 等のビュー。Week 2 で実装する。 */
export interface ViewPlugin {
  id: string
  label: string
  icon?: ReactNode
  render: (props: ViewRenderProps) => ReactNode
  /** フィルタを当てた時にこのビューが意味を持つか (例: Gantt は日付フィルタ必須) */
  supports?: (filter: ViewFilter) => boolean
}

export interface ViewRenderProps {
  workspaceId: string
  items: Item[]
}

export interface ViewFilter {
  status?: string
  isMust?: boolean
}

/** custom_fields (jsonb) に格納されるカスタムフィールド。Week 2 以降。 */
export interface FieldPlugin<T = unknown> {
  id: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | (string & {})
  schema: z.ZodType<T>
  render: (props: { value: T }) => ReactNode
  edit: (props: { value: T; onChange: (v: T) => void }) => ReactNode
}

/** コマンドパレット / コンテキストメニュー / ボタン等に露出するアクション。 */
export interface ActionPlugin {
  id: string
  label: string
  group?: string
  icon?: ReactNode
  keywords?: string[]
  /** item コンテキストで呼べるアクションならここで絞り込む。undefined なら常時表示。 */
  applicableTo?: (item: Item) => boolean
  /** execute は UI 側の run に相当。Result ではなく void で返す (例外は呼出側で toast)。 */
  execute: (ctx: ActionContext) => void | Promise<void>
}

export interface ActionContext {
  workspaceId: string
  item?: Item
}

/** AI エージェントの役割定義 (PM / Researcher / Engineer 等)。Week 3 以降。 */
export interface AgentRole {
  id: string
  label: string
  model: string
  systemPromptVersion: number
  tools: string[]
}

export type PluginKind = 'view' | 'field' | 'action' | 'agent'
