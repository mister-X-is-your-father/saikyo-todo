'use client'

/**
 * ヘッダに置く PM Stand-up 起動ボタン。
 * - pending 中は disabled + 「Stand-up 実行中…」
 * - 成功時: full markdown を Dialog で表示 (toast head は dead-letter になる UX gap 解消、queue: standup-doc-uxgap A/3)
 * - 失敗時 toast.error
 * Day 25 で cron 化されるので、MVP はこのボタン経由の手動起動。
 */
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

import { useMutation } from '@tanstack/react-query'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'
import { unwrap } from '@/lib/result-unwrap'

import { runStandupAction } from '@/features/agent/actions'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  workspaceId: string
}

export function StandupButton({ workspaceId }: Props) {
  const [resultText, setResultText] = useState<string | null>(null)
  const standup = useMutation({
    mutationFn: async () => unwrap(await runStandupAction({ workspaceId })),
  })

  async function run() {
    try {
      const r = await standup.mutateAsync()
      const body = (r.text ?? '').trim()
      setResultText(body || '(本文空)')
      toast.success('PM Stand-up 完了 — ダイアログで全文表示')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : 'Stand-up に失敗しました')
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={standup.isPending}
        aria-busy={standup.isPending || undefined}
        onClick={() => void run()}
        data-testid="pm-standup-btn"
        title="PM Agent が in_progress / overdue / yesterday-done を要約して Stand-up Doc を生成"
        aria-label={
          standup.isPending
            ? 'PM Stand-up を実行中…'
            : 'PM Stand-up: 朝会サマリー Doc を生成 (PM Agent が in_progress / overdue / yesterday-done を要約)'
        }
      >
        {standup.isPending ? 'Stand-up 実行中…' : 'PM Stand-up'}
      </Button>
      <Dialog open={resultText !== null} onOpenChange={(o) => !o && setResultText(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>PM Stand-up サマリ</DialogTitle>
            <DialogDescription>
              PM Agent が生成した朝会サマリ。Doc として保存済 (一覧 view は Docs page で参照予定)。
            </DialogDescription>
          </DialogHeader>
          <div
            className="standup-md max-h-[60vh] overflow-y-auto text-sm leading-6 break-words whitespace-pre-wrap"
            data-testid="pm-standup-result-body"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{resultText ?? ''}</ReactMarkdown>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResultText(null)}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
