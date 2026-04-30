-- =====================================================================
-- iter517 (queue MS-1): workspace_settings.default_mode
-- methodology mode (none / taskchute / gtd) を workspace 単位で持たせる。
-- default 'none' で既存 user 影響 0 (opt-in)。URL ?mode= で per-session override 可。
-- 詳細: docs/methodology-modes-plan.md §6 (Mode switch UX)
-- =====================================================================

alter table public.workspace_settings
  add column default_mode text not null default 'none'
    check (default_mode in ('none', 'taskchute', 'gtd'));

comment on column public.workspace_settings.default_mode is
  'methodology mode: none (default) / taskchute (1 列 timeline + 打刻) / gtd (Inbox + Process + Weekly Review). URL ?mode= で per-session override 可';
