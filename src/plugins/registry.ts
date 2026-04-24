/**
 * プラグインレジストリ (in-memory Map)。
 *
 * - 各プラグインファイルが module top-level で `registerXxx(...)` を呼ぶ
 * - `core/index.ts` の barrel import で core 一括登録
 * - 同じ id を register すると上書き (feature override 可能)
 * - ssr / client で独立インスタンスになるが、登録が idempotent なので問題なし
 */
import type { ActionPlugin, AgentRole, FieldPlugin, ViewPlugin } from './types'

const views = new Map<string, ViewPlugin>()
const fields = new Map<string, FieldPlugin>()
const actions = new Map<string, ActionPlugin>()
const agents = new Map<string, AgentRole>()

export function registerView(p: ViewPlugin): void {
  views.set(p.id, p)
}
export function registerField(p: FieldPlugin): void {
  fields.set(p.id, p)
}
export function registerAction(p: ActionPlugin): void {
  actions.set(p.id, p)
}
export function registerAgent(p: AgentRole): void {
  agents.set(p.id, p)
}

export function getView(id: string): ViewPlugin | undefined {
  return views.get(id)
}
export function getField(id: string): FieldPlugin | undefined {
  return fields.get(id)
}
export function getAction(id: string): ActionPlugin | undefined {
  return actions.get(id)
}
export function getAgent(id: string): AgentRole | undefined {
  return agents.get(id)
}

export function listViews(): ViewPlugin[] {
  return Array.from(views.values())
}
export function listFields(): FieldPlugin[] {
  return Array.from(fields.values())
}
export function listActions(): ActionPlugin[] {
  return Array.from(actions.values())
}
export function listAgents(): AgentRole[] {
  return Array.from(agents.values())
}

/** テスト用: 全レジストリをクリア (通常コードからは使わない)。 */
export function _clearRegistriesForTest(): void {
  views.clear()
  fields.clear()
  actions.clear()
  agents.clear()
}
