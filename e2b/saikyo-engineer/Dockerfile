# saikyo-engineer e2b template (iter 246)
#
# 目的: e2b cloud sandbox で saikyo-todo の Engineer Agent を完全に走らせる。
# 標準 e2b template には Node + git しか入っていないので、verify (pnpm test)
# や e2e (Playwright + Supabase Local) も sandbox 内で完結させるために必要な
# ツールを baked-in する。
#
# Build:
#   $ cd e2b/saikyo-engineer
#   $ e2b template build  (E2B_API_KEY が必要)
#
# Use from runner:
#   await runViaCloudSandbox({ ..., template: 'saikyo-engineer' })
#
# Dockerfile 設計:
#   - e2b 公式 base image を継承 (Node 20 + git 同梱)
#   - pnpm (corepack 経由) を pre-install
#   - supabase CLI (local Postgres + GoTrue + Realtime) を install
#   - playwright + chromium (e2e 用) を install
#   - Docker-in-Docker は e2b 側でサポートされていない場合があるので、当面は
#     supabase をネイティブ install (postgres-server も同梱) で動かす方針
#   - claude CLI は実行時に `npm i -g @anthropic-ai/claude-code` で都度入れる
#     (template に焼かない理由: claude CLI が頻繁に更新される + image 肥大化回避)

FROM e2bdev/code-interpreter:latest

# ---- pnpm via corepack ----
RUN corepack enable \
 && corepack prepare pnpm@10.13.1 --activate

# ---- Supabase CLI (Postgres + GoTrue + Realtime ローカル起動) ----
# 公式 install script を使う。最新版を入れて pnpm db:reset を sandbox 内で動かす。
RUN curl -fsSL https://supabase.com/install.sh | sh \
 && supabase --version

# ---- Playwright + Chromium (e2e) ----
# Playwright deps (libnss3 / libatk-bridge2.0-0 etc) は e2bdev/code-interpreter
# に含まれるが、安全側で公式 deps install を流す。
RUN npx --yes playwright@latest install --with-deps chromium

# ---- Health check ----
RUN node --version \
 && pnpm --version \
 && supabase --version \
 && git --version

WORKDIR /workspace
