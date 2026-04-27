'use client'

/**
 * Phase 6.15 iter131: workspace_settings.team_context 編集 inline editor。
 * AI 経由 (Researcher / Goal 分解 等) のプロンプト末尾に inject される workspace 共通方針。
 * member 以下が見ても read-only (mutation で server 側 PermissionError)。
 */
import { useEffect, useRef, useState } from 'react'

import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import { useTeamContext, useUpdateTeamContext } from '@/features/workspace/hooks'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  workspaceId: string
}

export function TeamContextEditor({ workspaceId }: Props) {
  const q = useTeamContext(workspaceId)
  const upd = useUpdateTeamContext(workspaceId)
  const [draft, setDraft] = useState('')
  const lastSyncedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!q.data) return
    const key = q.data.teamContext
    if (lastSyncedRef.current === key) return
    lastSyncedRef.current = key
    setDraft(key)
  }, [q.data])

  const dirty = (q.data?.teamContext ?? '') !== draft

  async function handleSave() {
    try {
      await upd.mutateAsync(draft)
      toast.success('チームコンテキストを保存しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '保存に失敗 (admin 以上が必要)')
    }
  }

  return (
    <Card data-testid="team-context-editor">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">チームコンテキスト (AI プロンプトに inject)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="team-context-textarea" className="sr-only">
          チームコンテキスト
        </Label>
        <Textarea
          id="team-context-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="例: 当チームは TDD。MUST タスクは PR 必須。Slack #team-x で進捗報告。"
          rows={4}
          maxLength={4000}
          aria-label="チームコンテキスト (workspace 全体)"
          data-testid="team-context-textarea"
        />
        <div className="text-muted-foreground flex items-center justify-between text-[11px]">
          <span>
            {draft.length} / 4000 文字 — Goal 分解 / Researcher が prompt 末尾に毎回 inject
          </span>
          <Button
            type="button"
            size="sm"
            disabled={!dirty || upd.isPending}
            onClick={() => void handleSave()}
            data-testid="team-context-save-btn"
          >
            {upd.isPending ? '保存中…' : '保存'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
