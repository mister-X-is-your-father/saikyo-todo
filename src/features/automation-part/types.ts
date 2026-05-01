/**
 * queue: AP-1 substrate — AutomationPart interface 定義。
 *
 * 詳細は FEEDBACK_QUEUE.md "自動処理パーツ catalog" 参照。
 *
 * 1 part = 1 副作用 / 1 zod input / 1 zod output。3 layer (workflow node / agent
 * tool / MCP server tool) から同一定義を共有する。
 */
import type { ZodType } from 'zod'

import type { Result } from '@/lib/result'

/** part の副作用カテゴリ。MCP の scope (read / write) 判定 + audit に使う。 */
export type PartSideEffect = 'read' | 'write' | 'external'

/** part 分類。UI 上の grouping や filter にも使う。 */
export type PartCategory =
  | 'item'
  | 'schedule'
  | 'time'
  | 'comment'
  | 'doc'
  | 'ai'
  | 'notify'
  | 'external'

/**
 * part 実行時の文脈。layer ごとに異なる呼出元から build する:
 *   - workflow engine: workflow_run 起点
 *   - agent tool loop: agent_invocation 起点
 *   - MCP server: api_key + workspace 起点
 *
 * いずれも必ず workspaceId と「実行主体 actor」 を解決した状態で part に渡す。
 */
export interface PartContext {
  workspaceId: string
  /** actor 種別 — audit log の actor_type に直接対応 */
  actorType: 'user' | 'agent'
  /** actor の id (user.id or agent.id) */
  actorId: string
  /** 起動 layer の識別 (debug / audit に使う) */
  invokedFrom: 'workflow' | 'agent' | 'mcp' | 'direct'
}

/**
 * AutomationPart: part registry の単位。
 *
 * 実装上の注意:
 *   - run() 内で `recordAudit` を必ず書く (どの layer 経由でも audit が残る)
 *   - workspaceId は必ず ctx 経由 (input に直接含めない)
 *   - structured AI part は zod schema 強制 (fluffy 撲滅原則)
 *   - layer 統合 (workflow / agent / MCP) は AP-4 / AP-5 / AP-6 で行う
 */
export interface AutomationPart<I = unknown, O = unknown> {
  id: string
  label: string
  description: string
  category: PartCategory
  sideEffect: PartSideEffect
  input: ZodType<I>
  output: ZodType<O>
  run(input: I, ctx: PartContext): Promise<O>
}

/**
 * part を厳密な型で定義するための helper。
 *
 *   const itemCreatePart = definePart({
 *     id: 'item.create',
 *     ...
 *     input: ItemCreateInput,
 *     output: ItemSchema,
 *     run: async (input, ctx) => { ... }
 *   })
 *
 * これにより I / O が input / output schema から推論される。
 */
export function definePart<I, O>(
  spec: Omit<AutomationPart<I, O>, 'input' | 'output'> & {
    input: ZodType<I>
    output: ZodType<O>
  },
): AutomationPart<I, O> {
  return spec
}

export type AnyPart = AutomationPart<unknown, unknown>

export type PartInput<P> = P extends AutomationPart<infer I, unknown> ? I : never
export type PartOutput<P> = P extends AutomationPart<unknown, infer O> ? O : never

/** zod schema → JSON Schema 風 record (MCP / Anthropic Tool definition への bridge 用 placeholder) */
export interface PartManifestEntry {
  id: string
  label: string
  description: string
  category: PartCategory
  sideEffect: PartSideEffect
  inputJsonSchema: unknown
  outputJsonSchema: unknown
}

/**
 * iter590 refactor: part の run() で `if (!r.ok) throw new Error(...); return r.value`
 * の重複を 1 関数に集約する小ヘルパ。
 *
 * service の Result<T> を part 経由で「(part 経路 layer 不問で) throw on err」 へ
 * 揃える。error message 先頭に partId を必ず含めることで workflow / agent / MCP
 * のどの呼出 stack でも part を identify できる。
 *
 *   run: async (input, ctx) => {
 *     const r = await scheduleService.create({...})
 *     return unwrapPartResult('schedule.create', r)  // ← 重複 1 行に
 *   }
 *
 * 戻り型は `r.value` の型を T に narrow するための conditional return。
 * `r.error` は AppError を想定するが、message / code 双方を fallback で拾う。
 */
export function unwrapPartResult<T, E = unknown>(partId: string, r: Result<T, E>): T {
  if (r.ok) return r.value
  const e = r.error as { message?: unknown; code?: unknown }
  const detail =
    (typeof e?.message === 'string' && e.message) ||
    (typeof e?.code === 'string' && e.code) ||
    'unknown error'
  throw new Error(`${partId} failed: ${detail}`)
}
