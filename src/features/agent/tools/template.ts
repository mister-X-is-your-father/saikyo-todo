/**
 * Template 操作ツール。現状は `instantiate_template` のみ。
 *
 * - workspace_id は ctx から強制 (Agent 入力に依存しない)
 * - actor は 'agent' + ctx.agentId (audit + created_by_actor に記録)
 * - variables は自由な JSON object (Template 側の variablesSchema 検証は
 *   templateService.instantiateForAgent に委譲)
 */
import 'server-only'

import { z } from 'zod'

import { templateService } from '@/features/template/service'

import type { AgentToolFactory } from './types'

const InstantiateTemplateSchema = z.object({
  templateId: z.string().uuid(),
  variables: z.record(z.string(), z.unknown()).optional(),
  rootTitleOverride: z.string().max(500).optional(),
})

function jsonError(message: string, details?: unknown): string {
  return JSON.stringify({ ok: false, error: message, details: details ?? null })
}
function jsonOk(data: unknown): string {
  return JSON.stringify({ ok: true, ...(data as Record<string, unknown>) })
}

export const instantiateTemplateTool: AgentToolFactory = {
  definition: {
    name: 'instantiate_template',
    description:
      '指定 Template をこの workspace に展開 (instantiate) し、実 Item ツリーを生成する。' +
      '変数展開 (Mustache) と dueOffsetDays 計算は自動。root Item id が返るので、' +
      '続けて write_comment などで通知できる。',
    input_schema: {
      type: 'object',
      properties: {
        templateId: { type: 'string', description: '展開対象 Template の id (UUID)。' },
        variables: {
          type: 'object',
          description: 'Mustache 変数 (template.variablesSchema に準拠)。省略可。',
        },
        rootTitleOverride: {
          type: 'string',
          description: 'root Item のタイトルを上書きする場合のみ指定。',
        },
      },
      required: ['templateId'],
    },
  },
  build(ctx) {
    return async (input) => {
      const parsed = InstantiateTemplateSchema.safeParse(input ?? {})
      if (!parsed.success) {
        return jsonError('validation failed', parsed.error.flatten())
      }
      const result = await templateService.instantiateForAgent({
        templateId: parsed.data.templateId,
        workspaceId: ctx.workspaceId,
        agentId: ctx.agentId,
        variables: parsed.data.variables ?? {},
        rootTitleOverride: parsed.data.rootTitleOverride ?? null,
      })
      if (!result.ok) {
        return jsonError(result.error.code, result.error.message)
      }
      return jsonOk({
        instantiationId: result.value.instantiationId,
        rootItemId: result.value.rootItemId,
        createdItemCount: result.value.createdItemCount,
      })
    }
  },
}
