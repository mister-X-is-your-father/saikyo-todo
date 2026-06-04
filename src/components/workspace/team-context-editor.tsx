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
    <Card
      data-testid="team-context-editor"
      role="region"
      aria-labelledby="team-context-editor-heading"
    >
      <CardHeader className="pb-2">
        <CardTitle
          id="team-context-editor-heading"
          className="text-sm"
          role="heading"
          aria-level={2}
        >
          チームコンテキスト (AI プロンプトに inject)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="team-context-textarea" className="sr-only">
          チームコンテキスト
        </Label>
        <Textarea
          id="team-context-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          // iter313: Cmd/Ctrl+Enter で保存 (comment-thread iter228 / Slack / GitHub /
          // Notion 標準)。dirty + !pending のときだけ反応、IME 確定中は無視。
          onKeyDown={(e) => {
            if (
              (e.metaKey || e.ctrlKey) &&
              e.key === 'Enter' &&
              !e.nativeEvent.isComposing &&
              dirty &&
              !upd.isPending
            ) {
              e.preventDefault()
              void handleSave()
            }
          }}
          placeholder="例: 当チームは TDD。MUST タスクは PR 必須。Slack #team-x で進捗報告。 (Cmd/Ctrl+Enter で保存)"
          rows={4}
          maxLength={4000}
          aria-keyshortcuts="Meta+Enter Control+Enter"
          aria-label={
            draft.length === 0
              ? 'チームコンテキスト (workspace 全体、最大 4000 文字、AI プロンプト末尾に inject、Cmd/Ctrl+Enter で保存)'
              : draft.length > 3800
                ? `チームコンテキスト (現在 ${draft.length} / 4000 文字、上限近接、Cmd/Ctrl+Enter で保存)`
                : `チームコンテキスト (現在 ${draft.length} / 4000 文字、Cmd/Ctrl+Enter で保存)`
          }
          data-testid="team-context-textarea"
        />
        <div className="text-muted-foreground flex items-center justify-between text-[11px]">
          <span>
            {draft.length} / 4000 文字 — Goal 分解 / Researcher が prompt 末尾に毎回 inject
          </span>
          <Button
            type="button"
            size="sm"
            className="min-h-11"
            disabled={!dirty || upd.isPending}
            aria-busy={upd.isPending || undefined}
            onClick={() => void handleSave()}
            data-testid="team-context-save-btn"
            aria-keyshortcuts="Meta+Enter Control+Enter"
            // iter1162: 旧 aria-label 3 path とも visible "保存" / "保存中…" を
            // 中位置 ("保存不要" / "を 保存中…" / "を 保存 (...)") に持ち voice
            // control prefix-matching「click 保存 / 保存中…」 match 不可
            // (substring 一致のみ)。iter1093-1161 sweep に揃え visible 冒頭固定。
            aria-label={
              !dirty
                ? '保存 — チームコンテキストに変更がないため保存不要'
                : upd.isPending
                  ? '保存中… — チームコンテキストを保存中…'
                  : '保存 — チームコンテキストを保存 (AI プロンプト末尾に inject)'
            }
            /* iter2235: team-context save button の aria-label は state-dependent 3-path
               (!dirty / pending / idle) で SR には full context (変更無 / 保存中 / inject 副作用)
               を渡すが browser tooltip にならず sighted は hover で同 context disclose 不可。
               iter221 sprint 期間保存 button / iter224 budget 保存 button と同 state-dependent
               title=aria-label sync pattern、save 系 button family の team-context 1 element 補完。 */
            title={
              !dirty
                ? '保存 — チームコンテキストに変更がないため保存不要'
                : upd.isPending
                  ? '保存中… — チームコンテキストを保存中…'
                  : '保存 — チームコンテキストを保存 (AI プロンプト末尾に inject)'
            }
          >
            <span aria-hidden="true">{upd.isPending ? '保存中…' : '保存'}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
