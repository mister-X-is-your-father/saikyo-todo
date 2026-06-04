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
 *
 * iter306 basics: 各 toggle 行に通知 type と同 graphical pattern (icon + 色 chip)
 * を加える。`getNotificationTypeVisual` (iter296 並走 type-visual.ts) を流用、
 * notification-bell の row と同じ視覚言語で「設定 ↔ 実際の通知」が紐づく。
 */
import {
  AlarmClock,
  AlertCircle,
  AtSign,
  Bell,
  type LucideIcon,
  Settings,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'

import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/features/notification/hooks'
import type { NotificationPreferenceUpdate } from '@/features/notification/repository'
import {
  getNotificationTypeVisual,
  type NotificationIconKey,
} from '@/features/notification/type-visual'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * iter296 並走 (notification-bell) と同 mapping。toggle 行の type chip に使う。
 * 共通化候補だが notification-bell.tsx と内容が同じ 5 行 map で、現時点で
 * 集約してもリスク (race) が高いので各 component で同じ shape を保持。
 */
const TYPE_ICON: Record<NotificationIconKey, LucideIcon> = {
  alarm: AlarmClock,
  'at-sign': AtSign,
  'user-plus': UserPlus,
  'alert-circle': AlertCircle,
  bell: Bell,
}

interface ToggleSpec {
  key: keyof NotificationPreferenceUpdate
  /** notification.type と同 vocabulary (`type-visual` で逆引き)。 */
  type: 'heartbeat' | 'mention' | 'invite' | 'sync-failure'
  label: string
  description: string
}

const TOGGLES: ToggleSpec[] = [
  {
    key: 'emailForHeartbeat',
    type: 'heartbeat',
    label: 'MUST 期日接近 (Heartbeat)',
    description: '7 日 / 3 日 / 1 日前 / 期限切れの MUST Item をメール通知',
  },
  {
    key: 'emailForMention',
    type: 'mention',
    label: 'コメント言及 (Mention)',
    description: '@user 言及されたときにメール通知',
  },
  {
    key: 'emailForInvite',
    type: 'invite',
    label: 'ワークスペース招待 (Invite)',
    description: 'ワークスペースに追加されたときにメール通知',
  },
  {
    key: 'emailForSyncFailure',
    type: 'sync-failure',
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

  // iter762: button aria-label に現在 ON 件数を含める。data fetch 中は "..." fallback。
  const onCount = data
    ? TOGGLES.filter((t) => Boolean(data[t.key as keyof typeof data])).length
    : null
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          /* iter1505: iter1093-1504 em-dash sweep に追従し () → em-dash 区切に。
             icon-only button (Bell-like icon は aria-hidden) なので accessible name =
             aria-label の値、voice control「click 通知設定」 prefix match 維持。
             iter1764: icon-only button で aria-label は browser tooltip にならず sighted は
             hover で即把握できなかった。title 付与で aria-label と同 text disclosure。 */
          aria-label={
            onCount !== null
              ? `通知設定 — メール通知 ${onCount}/${TOGGLES.length} 種 ON`
              : '通知設定 — メール通知 4 種を ON/OFF'
          }
          title={
            onCount !== null
              ? `通知設定 — メール通知 ${onCount}/${TOGGLES.length} 種 ON`
              : '通知設定 — メール通知 4 種を ON/OFF'
          }
          aria-haspopup="dialog"
          className="min-h-11 min-w-11"
          data-testid="notification-preferences"
        >
          {/* iter332: lucide icon に aria-hidden を付与し SR の冗長 announce を抑制
              (Button の aria-label が完全に意味伝達済、icon は decorative)。 */}
          <Icon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-1rem)] gap-0 p-0"
        aria-labelledby="notification-preferences-heading"
      >
        <div className="border-b px-3 py-2">
          {/* SR の heading navigation (h ショートカット) で popover に到達した
              直後にラベルが聞ける (iter427 NotificationBell と同 pattern)。
              visual サイズ text-sm 維持、heading semantic だけ追加。 */}
          <h2 id="notification-preferences-heading" className="text-sm font-medium">
            通知設定 (メール)
          </h2>
          <p className="text-muted-foreground mt-0.5 text-[10px]">
            実 SMTP / Resend 連携前のため現状はモック outbox に記録されます
          </p>
        </div>
        <ul className="divide-y" aria-labelledby="notification-preferences-heading">
          {TOGGLES.map((spec) => {
            const checked = data ? Boolean(data[spec.key]) : false
            const visual = getNotificationTypeVisual(spec.type)
            const TypeIcon = TYPE_ICON[visual.iconKey]
            return (
              <li key={spec.key} className="px-3 py-2" data-notification-type={spec.type}>
                <Label
                  htmlFor={`pref-${spec.key}`}
                  className="flex min-h-11 cursor-pointer items-start gap-3 text-xs leading-snug"
                >
                  <input
                    id={`pref-${spec.key}`}
                    type="checkbox"
                    className="mt-0.5 size-4 cursor-pointer accent-current"
                    checked={checked}
                    disabled={isLoading || update.isPending}
                    aria-busy={update.isPending || undefined}
                    onChange={(e) => void setFlag(spec.key, e.target.checked)}
                    data-testid={`pref-toggle-${spec.key}`}
                  />
                  <span
                    className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded ring-1 ring-inset ${visual.bgClass} ${visual.textClass} ${visual.ringClass}`}
                    role="img"
                    aria-label={`${visual.label}通知`}
                    /* iter1909: icon-only chip で visible は icon のみ、隣 span に
                       spec.label (full) は表示されるが icon 上 hover で「{label}通知」 disclose
                       (item-deps DirectionIcon iter1907 / activity-icon iter1903 同 pattern)。 */
                    title={`${visual.label}通知`}
                  >
                    <TypeIcon className="size-3" aria-hidden="true" />
                  </span>
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
