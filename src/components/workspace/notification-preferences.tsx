'use client'

/**
 * 通知設定パネル — workspace ヘッダ右端の utility に置く。
 *
 * - 4 個の boolean toggle (heartbeat / mention / invite / sync-failure)
 * - Popover 内に配置 (UI 専有面積を抑える)
 * - 即時反映: クリック → optimistic update なしで更新後 invalidate
 *
 * 通知設定は user 単位 (workspace 横断)。MVP 期は in-app チャネルは常時 ON のため、
 * email チャネルの 4 フラグだけを管理する。
 */
import { type LucideIcon, Settings } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/features/notification/hooks'
import type { NotificationPreferenceUpdate } from '@/features/notification/repository'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface ToggleSpec {
  key: keyof NotificationPreferenceUpdate
  label: string
  description: string
}

const TOGGLES: ToggleSpec[] = [
  {
    key: 'emailForHeartbeat',
    label: 'MUST 期日接近 (Heartbeat)',
    description: '7 日 / 3 日 / 1 日前 / 期限切れの MUST Item をメール通知',
  },
  {
    key: 'emailForMention',
    label: 'コメント言及 (Mention)',
    description: '@user 言及されたときにメール通知',
  },
  {
    key: 'emailForInvite',
    label: 'ワークスペース招待 (Invite)',
    description: 'ワークスペースに追加されたときにメール通知',
  },
  {
    key: 'emailForSyncFailure',
    label: '外部同期失敗 (Sync Failure)',
    description: 'Time entry など外部同期が失敗したときにメール通知 (デフォルト OFF)',
  },
]

export function NotificationPreferencesButton({ Icon = Settings }: { Icon?: LucideIcon } = {}) {
  const { data, isLoading } = useNotificationPreferences()
  const update = useUpdateNotificationPreferences()

  async function setFlag(key: keyof NotificationPreferenceUpdate, next: boolean) {
    try {
      await update.mutateAsync({ [key]: next })
      toast.success('通知設定を更新しました')
    } catch (e) {
      toast.error(isAppError(e) ? e.message : '通知設定の更新に失敗しました')
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="通知設定"
          data-testid="notification-preferences"
        >
          <Icon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-1rem)] gap-0 p-0">
        <div className="border-b px-3 py-2">
          <p className="text-sm font-medium">通知設定 (メール)</p>
          <p className="text-muted-foreground mt-0.5 text-[10px]">
            実 SMTP / Resend 連携前のため現状はモック outbox に記録されます
          </p>
        </div>
        <ul className="divide-y">
          {TOGGLES.map((spec) => {
            const checked = data ? Boolean(data[spec.key]) : false
            return (
              <li key={spec.key} className="px-3 py-2">
                <Label
                  htmlFor={`pref-${spec.key}`}
                  className="flex cursor-pointer items-start gap-3 text-xs leading-snug"
                >
                  <input
                    id={`pref-${spec.key}`}
                    type="checkbox"
                    className="mt-0.5 size-4 cursor-pointer accent-current"
                    checked={checked}
                    disabled={isLoading || update.isPending}
                    onChange={(e) => void setFlag(spec.key, e.target.checked)}
                    data-testid={`pref-toggle-${spec.key}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{spec.label}</span>
                    <span className="text-muted-foreground mt-0.5 block text-[10px]">
                      {spec.description}
                    </span>
                  </span>
                </Label>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
