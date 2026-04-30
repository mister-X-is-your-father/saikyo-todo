-- =====================================================================
-- Dev seed — `pnpm db:reset` 後に常駐させる開発用 user / workspace
-- =====================================================================
-- 目的: ローカル開発で `pnpm db:reset` (= `supabase db reset`) を走らせるたびに
-- 手動 signup し直さずに済むよう、固定 UUID/email/password の dev アカウントを
-- 投入する。本ファイルは config.toml で `db.seed.enabled = true` のため自動実行される。
--
-- ログイン情報 (ローカル限定):
--   email:    dev@example.com
--   password: dev12345
--   user_id:  00000000-0000-0000-0000-000000000001
--   ws_id:    00000000-0000-0000-0000-00000000000a (slug: dev)
--
-- 性質:
--   - 全 INSERT は ON CONFLICT DO NOTHING で冪等
--   - profiles は handle_new_user トリガで自動作成されるので INSERT 不要
--   - workspace 関連は create_workspace RPC を使えない (auth.uid() が null) ため手動 INSERT
--   - 本番には流れない (Supabase CLI のローカル reset でのみ実行)
-- =====================================================================

-- ---------- 1. dev user (auth.users + auth.identities) ----------
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  is_super_admin,
  is_sso_user,
  is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'dev@example.com',
  crypt('dev12345', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Dev User","locale":"ja","timezone":"Asia/Tokyo"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  '',
  false,
  false,
  false
)
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"dev@example.com","email_verified":true,"phone_verified":false}'::jsonb,
  'email',
  now(),
  now(),
  now()
)
on conflict (provider, provider_id) do nothing;

-- ---------- 2. dev workspace + member + settings + default statuses ----------
insert into public.workspaces (
  id,
  name,
  slug,
  owner_id,
  created_by_actor_type,
  created_by_actor_id
) values (
  '00000000-0000-0000-0000-00000000000a',
  'Dev Workspace',
  'dev',
  '00000000-0000-0000-0000-000000000001',
  'user',
  '00000000-0000-0000-0000-000000000001'
)
on conflict (id) do nothing;

insert into public.workspace_members (workspace_id, user_id, role)
values (
  '00000000-0000-0000-0000-00000000000a',
  '00000000-0000-0000-0000-000000000001',
  'owner'
)
on conflict (workspace_id, user_id) do nothing;

insert into public.workspace_settings (workspace_id)
values ('00000000-0000-0000-0000-00000000000a')
on conflict (workspace_id) do nothing;

insert into public.workspace_statuses (workspace_id, key, label, color, "order", type) values
  ('00000000-0000-0000-0000-00000000000a', 'todo',        'TODO',   '#94a3b8', 1, 'todo'),
  ('00000000-0000-0000-0000-00000000000a', 'in_progress', '進行中', '#3b82f6', 2, 'in_progress'),
  ('00000000-0000-0000-0000-00000000000a', 'done',        '完了',   '#22c55e', 3, 'done')
on conflict (workspace_id, key) do nothing;

-- ---------- 3. audit_log エントリ (任意、整合性のため) ----------
insert into public.audit_log (
  workspace_id, actor_type, actor_id, target_type, target_id, action, after
) values (
  '00000000-0000-0000-0000-00000000000a',
  'user',
  '00000000-0000-0000-0000-000000000001',
  'workspace',
  '00000000-0000-0000-0000-00000000000a',
  'create',
  '{"name":"Dev Workspace","slug":"dev","seed":true}'::jsonb
);
