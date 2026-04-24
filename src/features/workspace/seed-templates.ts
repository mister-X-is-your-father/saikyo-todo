/**
 * Workspace 作成時に投入するサンプル Template。
 * REQUIREMENTS §受け入れ基準 "サンプル Template 1個自動投入" を満たす。
 *
 * 方針:
 *   - 失敗しても workspace 作成は成立させる (log のみ)。
 *   - adminDb で挿入 (userId を createdBy に入れて、通常の Template と同じく扱える)。
 *   - 子 Template Item は Mustache 変数 + agent_role_to_invoke 連動も含める
 *     (MVP 総合デモの題材になるように)。
 */
import 'server-only'

import { recordAudit } from '@/lib/audit'
import { adminDb } from '@/lib/db/scoped-client'

import { templateItemRepository, templateRepository } from '@/features/template/repository'

export const SAMPLE_TEMPLATE_NAME = 'クライアント onboarding'

interface SampleTemplateItemDef {
  title: string
  description: string
  isMust?: boolean
  dod?: string | null
  dueOffsetDays?: number | null
  agentRoleToInvoke?: 'pm' | 'researcher' | null
}

const SAMPLE_ITEMS: SampleTemplateItemDef[] = [
  {
    title: 'キックオフ MTG を {{client_name}} と設定する',
    description: '日程候補を 3 案出して {{account_owner}} が打診する。',
    dueOffsetDays: 2,
  },
  {
    title: '契約書確認 ({{contract_start_date}} 開始)',
    description: '署名済 PDF を受領して共有ドライブに保存する。',
    isMust: true,
    dod: '契約書 PDF がドライブに保存され、URL が Comment で共有されている',
    dueOffsetDays: 3,
  },
  {
    title: 'Welcome メール下書き作成 (宛先: {{client_name}})',
    description: 'Researcher Agent に下書きを依頼する。レビューは {{account_owner}}。',
    dueOffsetDays: 1,
    agentRoleToInvoke: 'researcher',
  },
  {
    title: '担当 {{account_owner}} へ引き継ぎ',
    description: 'キックオフ後に Item ツリーを {{account_owner}} に assign して引き継ぐ。',
    dueOffsetDays: 5,
  },
]

/** 1 workspace に サンプル Template を 1 件投入。idempotent ではない (毎回作られる)。 */
export async function seedSampleTemplate(
  workspaceId: string,
  userId: string,
): Promise<{ templateId: string } | null> {
  try {
    return await adminDb.transaction(async (tx) => {
      const t = await templateRepository.insert(tx, {
        workspaceId,
        name: SAMPLE_TEMPLATE_NAME,
        description:
          '新規クライアントのオンボーディング手順。Welcome メール下書きは Researcher Agent が自動生成する想定。',
        kind: 'manual',
        variablesSchema: {
          type: 'object',
          properties: {
            client_name: { type: 'string' },
            contract_start_date: { type: 'string' },
            account_owner: { type: 'string' },
          },
          required: ['client_name', 'contract_start_date', 'account_owner'],
        } as never,
        tags: ['sample', 'onboarding'],
        createdBy: userId,
      })

      for (const i of SAMPLE_ITEMS) {
        await templateItemRepository.insert(tx, {
          templateId: t.id,
          title: i.title,
          description: i.description,
          parentPath: '',
          statusInitial: 'todo',
          isMust: i.isMust ?? false,
          dod: i.dod ?? null,
          dueOffsetDays: i.dueOffsetDays ?? null,
          agentRoleToInvoke: i.agentRoleToInvoke ?? null,
        })
      }

      await recordAudit(tx, {
        workspaceId,
        actorType: 'user',
        actorId: userId,
        targetType: 'template',
        targetId: t.id,
        action: 'seed',
        after: { name: t.name, itemCount: SAMPLE_ITEMS.length },
      })

      return { templateId: t.id }
    })
  } catch (e) {
    console.error(`[seed-templates] failed workspace=${workspaceId}`, e)
    return null
  }
}
