import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'

interface Props {
  title: string
  role: string
  subtitle: string
  /** ページ固有のアクション (ボタン群)。右側に並ぶ。 */
  pageActions?: ReactNode
  /**
   * 全 workspace ページ共通の右端 utility (ThemeToggle / NotificationBell 等)。
   * Phase 4 でこの slot に theme-toggle + notification-bell を入れる。
   */
  utility?: ReactNode
}

export function WorkspaceHeader({ title, role, subtitle, pageActions, utility }: Props) {
  return (
    // iter763: <header> は implicit banner landmark なので aria-label で page 固有
    // 名前を付けて SR ユーザの landmark navigation で複数 page header を区別可能に。
    // iter994: " header" suffix を削除 (iter945 sweep、element tag 名 redundant)。
    <header
      className="flex flex-wrap items-start justify-between gap-3"
      /* iter1563: 旧 `Workspace: ${title}` は ':' colon 区切で visible h1 "${title}" を末尾に持ち
         voice control prefix-matching「click ${title}」 / SR landmark navigation の prefix scan
         が strict prefix-match で不可。iter1553-1562 status/role Badge family + iter1556
         workspace-role Badge と同 file 内 pattern、visible 冒頭固定 + em-dash 区切。 */
      aria-label={`${title} — Workspace`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-2xl font-bold">{title}</h1>
          {/* iter1051: shadcn Badge は `<span>` レンダリングで role 無し、aria-label の
              SR picked-up が browser/SR で divergence。`role="img"` で authoritative 化
              (iter1023 / 1049 / 1050 と同 pattern、shadcn Badge は ...props spread で
              role prop 受け取り可)。inner role text は既に aria-hidden、SR は aria-label
              "あなたの workspace role: ${role}" 単独経路に集約。 */}
          <Badge
            variant="secondary"
            className="shrink-0"
            role="img"
            /* iter1556: 旧 aria-label `"あなたの workspace role: ${role}"` は visible "${role}" を
               末尾に持ち voice control prefix-matching「click owner」 / SR landmark navigation の
               prefix scan が strict prefix-match で不可 (substring 一致のみ)。iter1553/1554/1555
               status Badge family と同 pattern、visible 冒頭固定 + em-dash 区切。 */
            aria-label={`${role} — あなたの workspace role`}
          >
            <span aria-hidden="true">{role}</span>
          </Badge>
        </div>
        {/* iter1048: iter1047 で `aria-label="ログイン中アカウント: ${subtitle}"` を付けたが、
            Sprints / PDCA / Workflows / etc page で subtitle が `<context> · <email>` 形式の
            場合に "ログイン中アカウント: 計画 → 稼働 → 完了 · email" の mis-label に
            なる divergence (visible 内容と aria-label semantic 不一致)。subtitle 構造は
            page 依存固定で「常に email」 ではないため固定 prefix 化が誤り。aria-label 撤回
            で SR は visible text を直接読む元 behavior に restore。 */}
        <p className="text-muted-foreground mt-1 truncate text-xs">{subtitle}</p>
      </div>
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        /* iter1583: 旧 aria-label paren convention `"「${title}」 ヘッダー操作 (ページ固有アクション / ユーティリティ)"` は
           iter1093-1582 sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。
           iter1699: 同 file 29 行 <header> aria-label が `${title} — Workspace` (literal-prefix) なのに
           本 group aria-label は「${title}」 quote-prefix で divergent、SR landmark navigation の
           prefix scan で同 page header / group が異なる prefix を読み上げる不整合。「」 quote を外し
           ${title} literal-prefix で統一 (iter1697 backlog sortable / iter1698 subtask drag 続き)。 */
        aria-label={`${title} — ヘッダー操作 (ページ固有アクション / ユーティリティ)`}
      >
        {pageActions}
        {utility}
      </div>
    </header>
  )
}
