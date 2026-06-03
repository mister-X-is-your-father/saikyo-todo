# FEEDBACK_QUEUE.md — ユーザ指摘・要望の処理キュー

autonomous loop 中に届いたユーザの指摘・要望・質問・思いつきを、その場で
iter を中断せずキューイングして、後続 iter で 1 件ずつ消化するための共有ノート。

**運用:**

- ユーザコメントが来たら、本ファイル末尾に新規 entry を追記 (日時 + 原文 + 分類 +
  仮の対応方針)
- 現在の iter は中断せず最後まで完了
- 次 loop iter の「ギャップ選択」 phase で本ファイルの未処理項目を最優先で消化
- 消化したら `[x]` でチェック、commit メッセージに `(queue: <短い summary>)` を含める

---

## 未処理 (新しい順)

### 2026-04-30 — PDCA mode 抜本再設計 (stats panel → 実 cycle workflow + AI assist) ★ P0 ★

- [ ] **既存 PDCA panel (Plan/Do/Check/Act の単純 status カウント) を、「仮説 → 実行 → 検証 → 改善」の 1 cycle を貫通する workflow + AI 協業に再設計** — 分類: 機能追加 + UX 改善 + AI 統合 (P0、複数 commit)
  - 原文 (2026-04-30): 「pdca モードを使いやすく、意味あるモードにしてくれ」「pdca に ai を絡めたり、そもそもpdca の基本機能を網羅したり ux 改善したり」
  - **問題認識** (現状 = `src/features/pdca/` + `pdca-panel.tsx`):
    - PDCA = 単に **item.status の文字を P/D/C/A に renamed しただけ**。「Plan = todo 件数」「Check = 直近 7 日 done 件数」は PDCA 方法論の意図 (= cycle で学習) を満たさない
    - cycle ごとの「仮説 / 実測 / 学び / 次の改善」 を記録する場所がない → 学習が蓄積しない
    - AI が一切絡んでない
    - 既存 panel は dashboard 部品で、独立 mode として体験になっていない
  - **再設計の中核**: **`pdca_cycles` を first-class entity に**。1 cycle = 「目標 + 仮説 + 期間 + 関連 items + 実測 + 学び + 次決定」 の閉じた record。Item は cycle に link されて、cycle 終了時に振り返り対象になる
  - **新 schema 案**:

    ```sql
    create table pdca_cycles (
      id uuid pk,
      workspace_id uuid fk,
      title text not null,                  -- 「Q2 リリース速度改善」
      hypothesis text not null,             -- Plan: 「daily standup を朝→昼に変更で完了率上がる」
      target_metric text,                   -- Plan: 「週次完了 item 数 / 平均 lead time」
      target_value text,                    -- Plan: 「現状 12 → 16」 (自由記述、数値強制しない)
      plan_started_at, plan_finished_at,    -- 各 phase の打刻 (任意)
      do_started_at, do_finished_at,
      check_started_at, check_finished_at,
      actual_value text,                    -- Check: 実測値 (人間 or AI 集計)
      check_findings text,                  -- Check: 学び (markdown)
      act_decisions text,                   -- Act: 次 cycle に持ち越す改善決定 (markdown)
      status enum('plan','do','check','act','closed') default 'plan',
      next_cycle_id uuid fk null,           -- A → 次 cycle への chain
      owner_id uuid fk,
      created_at, updated_at, version,
      deleted_at
    );

    create table pdca_cycle_items (
      cycle_id uuid fk,
      item_id uuid fk,
      role enum('do','reference') default 'do',  -- 「この cycle で消化した item」 vs 「参考 item」
      added_at,
      primary key (cycle_id, item_id)
    );
    ```

  - **基本機能網羅 (UX)**:
    1. **mode 化**: workspace.default_mode に 'pdca' を追加 (既に WorkspaceModeSelector あり)。pdca mode 選択時の home は cycle list view
    2. **cycle CRUD**: list / create / edit / close / chain (A → 次 P)
    3. **phase 進行 UI**: 1 cycle を 4 タブ (Plan / Do / Check / Act) で表示、各タブで該当 field を編集。「次 phase へ」 button で status 進める (打刻自動)
    4. **Item link**: Do タブで「この cycle で消化する item」 を multi-select picker で紐付け、cycle 中の進捗 (% 完了) を panel 上部に常時表示
    5. **Check 自動集計**: 紐付け items の lead time / 完了率 / 期日遅延 を **算出 (純 algorithm)** して actual_value 候補として AI に渡す前に表示 (= fluffy 撲滅、widget 直表示)
    6. **Act → 次 cycle**: Act 入力後「次 cycle 作成」 button、`hypothesis` 欄に「前 cycle の learning を踏まえて...」 が prefill される
    7. **history view**: workspace 全 cycles の timeline、closed cycle の learnings を search 可能 (= 組織知)
  - **AI 統合 (fluffy 撲滅原則準拠 = structured output のみ)**:
    1. **Plan 生成補助**: title 入力 → AI が `{hypothesis, target_metric_candidates: string[], suggested_items: ItemRef[]}` を structured で提案。文章生成 NG、選択肢提示のみ
    2. **Check 学び抽出**: actual_value + 紐付け items の audit_log を input → AI が `{wins: string[2-3], gaps: string[2-3], anomalies: string[1-2]}` を structured で出す。「この cycle 良かった」一行感想 NG
    3. **Act 改善決定提案**: check_findings を input → AI が `{actions: { description, owner_candidate, est_min }[3] }` を structured で。最大 3 件、各々が次 cycle 開始時の Plan candidate になる
    4. **anomaly 早期検知**: Do 中に lead time が target を **超えそう** な時 (= 完了 % vs 経過時間 % で算出) anomaly として 1 行通知。AI 不要、純 algorithm
  - **6 軸スコア (期待)**: 可視化 5 / 操作 4 / 認知低減 4 / 漏れ防止 5 / やる気 4 / 効率化 4 — **軸 4 漏れ防止 + 軸 1 可視化が圧倒的本丸** (cycle で学んだことが消えない、次に活きる)
  - **設計哲学 (memory project_saikyo_todo_philosophy)**: 「目標達成サポート + 段取り力 + 思考力」 三本柱の **思考力** に直結。仮説 → 実測 → 学び を強制する型 = saikyo-todo を「単なる TODO」 から「成長 system」 に格上げ
  - **段階実装 commit 案** (各 1 commit):
    - `feat(pdca-cycle): pdca_cycles + pdca_cycle_items schema + service skeleton (queue: PDCA P-1 substrate)`
    - `feat(pdca-cycle): cycle list / create / detail page (queue: PDCA P-2 CRUD UI)`
    - `feat(pdca-cycle): 4-tab phase UI (Plan/Do/Check/Act) + 進行 button (queue: PDCA P-3 phase UI)`
    - `feat(pdca-cycle): item link picker + 進捗 % header (queue: PDCA P-4 link)`
    - `feat(pdca-cycle): Check 自動集計 widget (lead time / 完了率 / 期日遅延) (queue: PDCA P-5 algorithm widget)`
    - `feat(pdca-cycle): Act → 次 cycle chain + prefill (queue: PDCA P-6 chain)`
    - `feat(pdca-cycle): history view + learning search (queue: PDCA P-7 history)`
    - `feat(agent): PDCA Plan 生成補助 (structured: hypothesis + metric + items) (queue: PDCA AI-1)`
    - `feat(agent): PDCA Check 学び抽出 (structured: wins/gaps/anomalies) (queue: PDCA AI-2)`
    - `feat(agent): PDCA Act 改善決定提案 (structured: actions[3]) (queue: PDCA AI-3)`
    - `feat(pdca-cycle): Do 中 anomaly 早期検知 (純 algorithm) (queue: PDCA AI-4)`
    - `chore(pdca): 旧 PdcaPanel を mode-pdca の dashboard tab に降格、cycle が main view に (queue: PDCA P-8 cleanup)`
  - **既存資産との関係**:
    - 旧 `pdca-panel.tsx` (status counts) は cycle 内の Check 集計 widget に再利用 (=「dashboard tab」 として残す)
    - workspace.default_mode の選択肢 / WorkspaceModeSelector に 'pdca' 追加 (既に TaskChute / GTD / Kanban 等あり)
    - AI structured output 経路は fluffy widget 8 件で確立済み (`structured-output` helper / zod schema)
    - cycle ↔ item link は item_dependencies と同じ M:N pattern (既存 repository 流用可)

  **実装上の注意**:
  - cycle status は **手動進行が default**、自動進行は controversial なので Phase 2 以降
  - target_metric は **自由記述**。数値 metric の自動取得は「紐付け items の audit_log → 完了率」 ぐらいに留める (汎化禁止 = MVP scope 制御)
  - AI structured output は **必ず zod schema 強制** (`generateObject` 風)、純 text comment 経由 NG
  - Phase 進行時に `recordAudit(cycle, action='advance_phase', after={status})` を必ず書く
  - `pdca_cycle_items.role='do'` は cycle close 時に readonly 化 (history で freeze)

---

### 2026-04-30 — 自動処理パーツ catalog + workflow node 統合 + MCP からの atomic 起動 ★ P0 ★

- [ ] **「保存できる action 1 個 = 1 atomic part」 の catalog を作り、workflow node graph と MCP tool の両方から利用できる substrate にする** — 分類: 自動化基盤 (P0、複数 commit)
  - 原文 (2026-04-30): 「自動処理パーツの作成とかも頼みたい。最終的にそれらを繋いだり mcp で ai に自動実行させたりしたい」
  - **意図**: 既存 workflow (engine + node-presets) は「特定パターン」 が node-presets に hardcode されている。これを **「atomic part = 1 副作用 / 1 zod input / 1 zod output」 の小単位に分解** し、(1) workflow node の中身として composition、(2) MCP server の tool として AI 直叩き、の両方から使える共通 catalog にする
  - **既存資産** (確認済 2026-04-30):
    - `src/features/workflow/engine.ts` (DAG runner、node 実行 / approval / retry 込み)
    - `src/features/workflow/nodes/` (node 種別ごと file、現状 ai/slack/email/script 等)
    - `src/features/workflow/node-presets.ts` (node の sample preset)
    - `src/features/agent/tools/` (read / write / template — 既に AI tool 形式の atomic 操作)
    - `@modelcontextprotocol/sdk@1.29.0` (dev dep 既存)
    - REST API + MCP queue entry (本ファイル別 entry、auth + key infra)
  - **設計の中核**: 「atomic part」 を **3 layer** で表現する単一定義に集約:

    ```ts
    // src/features/automation-part/registry.ts (新規)
    export interface AutomationPart<I, O> {
      id: string                              // 'item.create' / 'slack.send' / 'ai.summarize'
      label: string
      category: 'item' | 'schedule' | 'time' | 'comment' | 'ai' | 'notify' | 'external'
      input: ZodSchema<I>
      output: ZodSchema<O>
      side_effect: 'write' | 'read' | 'external'  // permission + audit に使う
      run(input: I, ctx: PartContext): Promise<O>  // ctx = workspaceId / userId / db / audit
    }

    export const partRegistry = new Map<string, AutomationPart<unknown, unknown>>()
    export function registerPart(p: AutomationPart<unknown, unknown>) { ... }
    ```

  - **layer 1 = Workflow node**: workflow engine が `partRegistry.get(node.partId)` で実行。node-presets を「part への薄い wrapper」 に置換
  - **layer 2 = Agent tool**: `tools/index.ts` で part を Anthropic SDK tool definition に変換 (zod → JSON schema)。Claude が直接呼ぶ
  - **layer 3 = MCP server tool**: `src/app/api/mcp/route.ts` で part を MCP tool として expose。Bearer auth + scope 確認 (REST API entry の `api_keys` 流用)
  - **初期 part 一覧 (~15 件、既存機能を atomic 化)**:

    | id                     | layer | input                  | output          | 既存 source                 |
    | ---------------------- | ----- | ---------------------- | --------------- | --------------------------- |
    | item.create            | 1/2/3 | CreateItemInput        | Item            | itemService.create          |
    | item.update            | 1/2/3 | UpdateItemInput        | Item            | itemService.update          |
    | item.complete          | 1/2/3 | { id, expectedVersion} | Item            | itemService.toggleComplete  |
    | item.list_today        | 2/3   | { workspaceId }        | Item[]          | buildTodayGroups + repo     |
    | item.list_overdue      | 2/3   | { workspaceId }        | Item[]          | overdue helper              |
    | schedule.create        | 1/2/3 | CreateScheduleInput    | Schedule        | scheduleService.create      |
    | schedule.start_timer   | 1/2/3 | { itemId }             | Schedule        | scheduleService.startTimer  |
    | comment.create_on_item | 1/2/3 | CreateCommentInput     | CommentOnItem   | commentService.createOnItem |
    | time_entry.create      | 1/2/3 | CreateTimeEntryInput   | TimeEntry       | timeEntryService.create     |
    | notify.send            | 1/2/3 | { user_id, body }      | Notification    | notificationService.create  |
    | slack.send_message     | 1/2/3 | { channel, text }      | { ts }          | dispatchSlack               |
    | ai.summarize_item      | 1/2/3 | { itemId, focus? }     | { summary }     | researcher (structured)     |
    | ai.decompose_item      | 1/2/3 | DecomposeInput         | StagingProposal | decompose-proposal          |
    | ai.review_item         | 1/2/3 | { itemId }             | ReviewChecklist | (新規 = AC-2)               |
    | external.webhook_post  | 1/2/3 | { url, body }          | { status }      | (新規)                      |

  - **段階実装 commit 案**:
    - `feat(automation-part): registry + AutomationPart interface + 5 part 移植 (item.*) (queue: AP-1 registry)`
    - `feat(automation-part): schedule / time / comment / notify part 5 件 (queue: AP-2 batch)`
    - `feat(automation-part): ai / slack / external part 5 件 (queue: AP-3 batch)`
    - `feat(workflow): node-presets を part registry 経由に refactor (queue: AP-4 workflow integration)`
    - `feat(agent): tool/index.ts で part registry → Anthropic tool definition 自動生成 (queue: AP-5 agent integration)`
    - `feat(api/mcp): MCP server で part を tool として expose (queue: AP-6 MCP integration、REST API entry の Phase 5 と統合)`
  - **6 軸スコア (期待)**: 可視化 2 / 操作 4 / 認知低減 3 / 漏れ防止 2 / やる気 2 / 効率化 5 — **軸 6 効率化が圧倒的本丸**、AI 自動実行 + workflow 組合せの基盤
  - **MCP / REST API 既存 queue entry との関係**: 上記 entry が **auth / key infra (api_keys table + Bearer 認証)** を担当、本 entry が **tool 中身 (=どんな operation を expose するか) の catalog** を担当。両方揃うと「外部 AI が Bearer key で saikyo-todo の atomic part を組合せて自動実行」 が成立する

  **実装上の注意**:
  - part の `run` 内で `recordAudit` を必ず書く (workflow / agent / MCP どの経由でも audit が残る)
  - workspace_id は **必ず ctx 経由**、part 入力に直接含めない (auth scope と矛盾するパターンを禁止)
  - `side_effect: 'write'` の part は MCP の write scope key でのみ実行可
  - structured output 系 AI part は zod schema 強制 (fluffy 撲滅原則)
  - registry は **静的 register** (動的 plugin 化は POST_MVP)

---

### 2026-04-30 — AI との高度で手軽な分業・協業 シリーズ ★ P0 ★

- [ ] **AI を「同僚」として task に組み込み、1 click で任せる / 1 click で review してもらう / 提案 → 人間判断 のループを最小摩擦で回す体験を作る** — 分類: AI UX 設計 + 機能追加 (P0、複数 commit)
  - 原文 (2026-04-30): 「AI との高度で手軽な分業や協業ができるのを作りたい」
  - **意図**: 既存 AI feature (researcher / pm-standup / decompose / plan generation / assignee=AI) は **個別 button** 経由で散在。これを「AI 同僚 1 人がいるみたいな統一 UX」 に再構成し、人間と AI が **同じ task を交互に進める** 流れを最小クリックで実現する。
  - **既存 AI 資産**:
    - assignee=AI モード (item に AI assignee 設定 → 「Plan を生成」 button)
    - decomposeItem (item を subtask に AI 分解、staging proposal 経由 review)
    - researcherService (AI 調査 → comment / doc post、CLI 経路化済 iter520)
    - PM Stand-up widget 化 (iter524 で AI 文章 → widget 置換)
    - workspace_settings.team_context (AI prompt 末尾に inject される workspace 方針)
  - **段階実装 候補 (各 P0 candidate、依存順)**:
    1. **AC-1 「AI に任せた」 ワンクリック** — item edit dialog に大きい「AI に任せた」 button、押すと: ① assignee=AI 自動設定 + ② plan 生成 + ③ 通知 「AI が plan を立てたので確認してください」 + ④ 完了時 review modal で staging subtasks 表示
    2. **AC-2 「AI に review してもらう」** — 任意 task (人間担当) で「AI に review」 button、AI が dod / plan / output を読んで checklist (✅ ⚠ ❌) + 改善提案 1-3 件を comment で post
    3. **AC-3 inline AI 提案 (pair programming 風)** — item description 編集中に「AI に書かせる」 mini button、現在 cursor 周辺 + workspace context で suggestion を inline 表示、Tab で accept、Esc で reject
    4. **AC-4 hand-off 履歴 view** — 「最近 AI が触った task」 list、人 ↔ AI のターン履歴 (誰が何をした) を 1 panel で可視化、漏れ防止 + 学習材料に
    5. **AC-5 AI 同僚 persona 設定** — workspace_settings に「team_context」 (既存) + 「ai_persona_role」 (例: "junior backend dev" / "research analyst" / "PM") を追加、prompt に常時 inject、AI 出力の tone を統一
    6. **AC-6 AI 出力 quality 自己評価** — 各 AI 生成成果物 (plan / decompose / research) に「役立った? 1-5」 user feedback、structured で蓄積し prompt 改善 / 監視に使う
  - **6 軸スコア (期待)**: 可視化 4 / 操作 5 / 認知低減 5 / 漏れ防止 4 / やる気 5 / 効率化 5 — 軸 5 やる気 + 6 効率化が直結
  - **設計哲学 (memory project_saikyo_todo_philosophy)**: 「AI を使うことで人間の段取り力が育つ」 角度を意識 — AI が全部やる != ゴール、「AI に任せる判断 → review する判断」 を鍛える UX に
  - 関連 queue: REST API/MCP server 化 (本 entry の上、AI agent から叩けるようにする substrate)、fluffy → widget 化 8 件 (AI 出力の structured 化、本 entry の前提)

  **段階実装 commit 案**:
  - `feat(item): AI 任せたワンクリック button + plan 自動生成 (queue: AI 分業 AC-1)`
  - `feat(comment): AI review request — checklist + 改善 1-3 件 (queue: AI 分業 AC-2)`
  - `feat(item): description inline AI 提案 (Tab accept) (queue: AI 分業 AC-3)`
  - `feat(workspace): AI hand-off 履歴 view (queue: AI 分業 AC-4)`
  - `feat(workspace): ai_persona_role 設定 + prompt inject (queue: AI 分業 AC-5)`
  - `feat(agent): AI 出力 quality feedback (1-5 + 蓄積) (queue: AI 分業 AC-6)`

---

### 2026-04-30 — REST API + MCP server 化 (saikyo-todo を外部から叩けるように) ★ P0 ★

- [ ] **saikyo-todo の主要 entity (item / schedule / goal / template / time-entry) を REST API として外部公開、加えて MCP server として AI agent / Claude Desktop 等から直接叩けるようにする** — 分類: 外部統合 (P0)
  - 原文 (2026-04-30 conversation 中): 「APIやMCP化をしてほしい」
  - **意図**: saikyo-todo の data / 操作を 「AI agent から自然に組合せられる component」 にする。既存 internal Server Action は UI 専用 (Result<T>)、外部から叩くには公開 API + auth scope + rate limit が必要。MCP は Claude Desktop / AI Agent SDK が最適化されたプロトコル、AI 駆動運用 (= プロジェクトの哲学「AI 自動実行」) に直結。
  - **設計案 (要 plan で詳細化)**:
    1. **REST API layer** (`/api/v1/*`):
       - 既存 service 層を re-use (auth は Bearer token = `api_keys` 新 table、scope は workspace_id + role)
       - resource: items / item-schedules / time-entries / goals / templates / comments
       - OpenAPI 3.1 spec 自動生成 (`zod-to-openapi`、既存 zod schema 流用)
       - Next.js Route Handlers (`src/app/api/v1/...`)
       - 公式 SDK 候補: TypeScript / Python (auto-generate from OpenAPI)
    2. **MCP server** (`src/app/api/mcp/route.ts` or 別 process):
       - `@modelcontextprotocol/sdk` (既に dev dep にある: `^1.29.0`) を使う
       - tool 化対象 (read 系を最初): `list_items` / `get_item` / `list_today_schedule` / `get_goals`
       - tool 化 (write 系、scope=member): `create_item` / `update_item_status` / `add_time_entry`
       - workspace 認証: Bearer token (REST API と同じ `api_keys` table)
       - tool spec は zod schema → MCP tool input schema へ変換 (helper)
    3. **schema 追加**: `api_keys (id, workspace_id, label, key_hash, scopes text[], created_by, last_used_at, revoked_at, expires_at)`
       - key 生成は base64url(32 bytes)、保存は SHA-256 hash のみ (一度切りの平文表示)
       - scopes: 'read' / 'write' / 'admin' を text[] で
  - **段階実装 (phase ごと別 P0)**:
    1. `api_keys` schema + service (create / revoke / list 自分の rows)
    2. `withApiAuth` middleware (Bearer 検証 + scope check) + 1 endpoint smoke (`GET /api/v1/items?workspace_id=...`)
    3. items REST CRUD (list / get / create / update / delete) — read first, write next iter
    4. item-schedules / time-entries / goals REST
    5. MCP server skeleton (read-only tools 5 件)
    6. MCP write tools (member scope のみ)
    7. OpenAPI 3.1 spec 自動生成 + `/api/v1/openapi.json` endpoint
    8. workspace settings UI で API key 発行 / revoke
  - **環境変数**: `MCP_SERVER_PUBLIC_URL` (Claude Desktop config で参照、default 自分の domain)
  - **6 軸スコア (期待)**: 可視化 1 / 操作 4 / 認知負荷低減 2 / 漏れ防止 4 / やる気 2 / 効率化 5 — **5 軸 効率化が圧倒的本丸** (AI 経由で saikyo-todo を batch 操作できる)。

  **関連既存資産**:
  - `@modelcontextprotocol/sdk@1.29.0` (dev dep)
  - 既存 service / Server Action layer (Result<T>) を thin wrap で API 化可能
  - `zod` schema は OpenAPI / MCP tool spec に直接変換可能 (`zod-to-openapi` pkg 既存無し、要 install)
  - audit_log は既に全 mutation で記録 → API 経由も同じ audit が残る

  **重要 (cloud agent 注意)**:
  - **既存 Server Action を直接 export しない**。auth context が UI session 前提なので、Bearer 検証して `withUserDb(api_key.workspace_member.user_id)` で別 path を作る
  - rate limit は最初は memory ベース (token bucket per api_key、1 process 内)、本番は Redis 化 (POST_MVP)
  - MCP server は **Streamable HTTP transport** (sse/stdio ではない、Next.js Route Handler で実装)

---

### 2026-04-30 — Calendar 機能完成、追加 5 規望を P0 投入 (Calendar conv 由来)

- [x] **二車線 Calendar view (想定 vs 実測 timeline)** — 完了 (commit 8624154)
  - item_schedules table 新設 / features/schedule layer / 27 test pass / Realtime + 楽観ロック
  - `src/components/schedule/`, `src/features/schedule/`, plugin 登録、active-timer と接続

以下 5 件は同 conversation で連続して来た規望を分類して P0 化したもの。
**設計哲学** (memory `project_saikyo_todo_philosophy.md` 反映): 「目標達成・思考力・段取り力を鍛える道具」。各 P0 はこの軸 + 6 軸 (UX 卓越憲章) で評価。

---

### 2026-04-30 — タスク metadata 拡張 (input/output/goal/関係者/レビュー/添付) ★ P0 ★

- [ ] **各 task に input / output / goal / 関係者 (stakeholders) / 添付 (URL or file) / レビュー依頼 を設定でき、output↔input マッチで依存関係を自動推論し、関係者には Web UI 通知が届く** — 分類: 機能拡張 (P0)
  - 原文 (2026-04-30 conversation):
    - 「タスクにインプットとアウトプットを設定できる機能つけたい。それで依存関係もわかるし!!」
    - 「インプットとアウトプットは各タスクごとに設定できるように!」
    - 「タスクのゴールもね。」
    - 「関係者とかも。」
    - 「関係者にwebui上で通知行くねん」
    - 「メールのccみたいなもんや」
    - 「成果物のurlやファイルを添付や記入出来るのも頼む。」
    - 「あとレビュー依頼できる機能もね。」
  - **意図 (思考力・段取り力)**: タスクを作る時に「何が要るか / 何を出すか / 何のためか」を強制的に言語化させる。output↔input が一致したら自動で依存推論 → 段取り思考が育つ。
  - **schema 追加**:
    1. `items.goal text` 列 (達成目的、dod=完了基準とは別軸。例: goal="チームに浸透させる", dod="議事録に承認サインが入る")
    2. `item_io_artifacts (id, item_id, kind 'input'|'output', label, url, file_path, mime, created_by, created_at)` 中間テーブル
    3. `item_stakeholders (item_id, user_id, added_at)` 中間テーブル (assignees とは別軸、CC 的)
    4. `item_review_requests (id, item_id, requested_by, requested_at, status 'pending'|'approved'|'changes_requested', resolved_at, resolved_by)` テーブル
  - **service 層**:
    - `setItemIoArtifacts / setItemStakeholders / requestReview / resolveReview` を items service に追加
    - **依存推論**: pure helper `inferDependenciesFromIO(items, ioArtifacts)` で output.label が他 item の input.label と一致すれば `item_dependencies` に `blocks` を suggest (自動挿入は別 confirm UI、最初は提案のみ)
    - 関係者追加 / review request 時に **既存 notifications テーブル経由で in-app 通知** 発火 (受信者は stakeholder / requester)
  - **UI 拡張**:
    - ItemEditDialog (`src/components/workspace/item-edit-dialog.tsx`) に新タブ「I/O & ゴール」追加
    - goal 入力 (textarea) / inputs リスト / outputs リスト / 関係者 picker / レビュー依頼 button + 履歴
    - 添付: URL は text input、file は Supabase Storage upload (新規 bucket `item-artifacts`)
  - **段階実装 (commit を分ける)**:
    1. schema + migration + repo (1 commit)
    2. service + zod + test (1 commit)
    3. UI タブ (1 commit)
    4. 依存推論 helper + 提案 UI (1 commit)
    5. 関係者通知 + レビュー依頼 UI (1 commit)
    6. file upload (Supabase Storage) (1 commit、後続 iter でも OK)
  - **6 軸スコア (期待)**: 可視化 4 / 操作 3 / 認知負荷低減 4 / 作業漏れ防止 5 / やる気 3 / 効率化 4

---

### 2026-04-30 — 全員 broadcast 依頼 (この設定各 PC でやっといて 風) ★ P0 ★

- [ ] **チーム全員に同じ task を一斉配布、各人がチェックリスト的に消化、進捗を集約 view で見られる** — 分類: 機能拡張 (P0)
  - 原文 (2026-04-30): 「全員にタスク頼みたいとき (この設定各pcでやっといて) みたいなのとかも簡単にできるようにしたい!わかる?」
  - **意図 (作業漏れ防止 + 効率化)**: チーム運用で頻出する「全員これ確認して」「全員 PC でこの設定やって」を 1 click で全員に配布、誰がやった/やってないが一目で分かる。
  - **設計案 (要 plan で詳細化)**:
    - **方式 A**: 既存の item を **template 化** + workspace member 全員に template instantiate (1 task/member)。集約 view で member × 完了状態を見る
    - **方式 B**: 1 item に複数 assignee (既存 `item_assignees` で可能) + 「assignee ごとに done state」を持つ新 table `item_assignee_progress (item_id, actor_type, actor_id, done_at)`
    - 方式 B が schema 追加少ない、UI シンプル。**方式 B を採用**
  - **schema 追加**: `item_assignee_progress (item_id, actor_type, actor_id, done_at)` (PK = 3 列)
  - **UI**:
    - quick-add に「全員に頼む」option (作成と同時に全 member を assignee + progress 行 init)
    - item card / kanban tile に「3/5 完了」badge
    - 集約 view: 「broadcast 進捗」専用 tab (member × broadcast item の matrix、green/grey)
    - 各 member は自分の行で「自分の済」だけ check (他人のは disable)
  - **段階実装**:
    1. schema + repo (1 commit)
    2. quick-add に option + service (1 commit)
    3. progress badge + matrix view (1 commit)
  - **6 軸スコア**: 可視化 5 / 操作 4 / 認知負荷低減 3 / 作業漏れ防止 5 / やる気 3 / 効率化 5

---

### 2026-04-30 — 連絡待ちモード (Waiting For) + リマインド + Slack DM 連絡 シリーズ ★ P0 ★

- [ ] **task を「連絡待ち」 状態に分類、依頼先 (チーム内 member / チーム外 contact) と経過日数を可視化、N 日経過で自動リマインド (in-app + Slack DM 送信)** — 分類: 機能拡張 + 外部統合 (P0、5-7 commit)
  - 原文 (2026-04-30): 「連絡待ちモードとかもやりたいな。チーム内、チーム外への依頼事項がどんな感じか。リマインドとかも入れてくれる。あと、Slack で連絡してくれる機能欲しい。」
  - **意図 (作業漏れ防止 + 効率化)**: 「相手待ち」 になった task が見えなくなって忘れる problem を撲滅。GTD の Waiting For list を強化、自動リマインド + Slack DM で「言ったまま放置」を不可能にする。
  - **既存資産との関係**:
    - GTD GT-1 が「list 5 種 (Next/Project/**Waiting For**/Someday/Reference) を workspace_statuses preset で導入」 を含む — 本 entry はその Waiting For を独立に深掘り
    - Slack ワンポチでタスク化 entry (本 entry の下) と Slack OAuth 基盤を共有 (`slack_workspace_tokens` / `slack_user_links` table)
    - 既存 `notifications` table + `pg-boss` worker (cron 経路で recurring template instantiation 動いてる)
    - 既存 `severityFromOverdueDays` (lib/widget/severity.ts) で経過日数の色付けが流用可能
  - **段階実装 (各 P0 candidate、依存順)**:
    1. **WT-1 schema + service**: `items.waiting_for jsonb` (`{kind: 'internal'|'external', targetUserId?, targetContactId?, targetLabel: string, requestedAt: ts, reminderCadenceDays?: number, lastRemindedAt?: ts, slackChannelId?: string}`) + `setWaitingFor` / `clearWaitingFor` / `escalateWaiting` service + 楽観ロック + audit (`set_waiting_for`)
    2. **WT-2 「連絡待ち」 view plugin**: Today / Inbox / Kanban の隣に登録、依頼先別 grouping (内部 = workspace member、外部 = contact)、経過日数 chip (`<3d ok / 3-7d warn / 7d+ danger`、`severityFromOverdueDays` 流用)、次リマインド予定時刻
    3. **WT-3 contact 帳**: 新 table `workspace_external_contacts (id, workspace_id, name, email?, slack_user_id?, role, created_by, …)` — チーム外の人を保存して再利用、CRUD service + UI
    4. **WT-4 リマインド worker**: pg-boss cron (1h tick) で `lastRemindedAt + cadenceDays` を超えた item を pull → notifications 発行 + lastRemindedAt 更新。複数同時 cadence に対応 (default 3d)
    5. **WT-5 Slack DM 送信 service**: 既存 Slack OAuth (queue: Slack ワンポチ) の bot token で `chat.postMessage` を打つ thin wrapper、send-fail-soft (DB 書込みは成功させる)
    6. **WT-6 連絡待ち開始時 Slack DM 自動送信**: setWaitingFor で `targetUserId` が Slack 連携済みなら DM 送信 (内容: item title + saikyo-todo link + 期限/依頼内容)、既存 `slack_user_links` table 流用
    7. **WT-7 リマインド時 Slack DM 送信**: WT-4 worker が in-app notification と並行して、`slackChannelId` or `targetUserId` の Slack DM にリマインド送信 (重複送信防止: lastRemindedAt で gate)
    8. **WT-8 quick-add に 「待ち」 toggle**: item 作成時に「相手待ち」 checkbox + 依頼先 picker (workspace member or external contact) を出して 1 step 投入
  - **schema 追加**:
    - `items.waiting_for jsonb` (nullable) — 単純 jsonb で柔軟性確保、専用テーブル化は次フェーズ
    - `workspace_external_contacts` (WT-3 で追加)
    - `slack_workspace_tokens` / `slack_user_links` は **Slack ワンポチ entry で先行 install**
  - **6 軸スコア (期待)**: 可視化 5 (依頼先別 grouping + 経過日数 chip) / 操作 4 / 認知低減 4 / **漏れ防止 5** / やる気 3 / 効率化 5
  - **設計哲学 直結**: 「思考力・段取り力を鍛える」 = 何を誰に頼んでるか / どれが返ってきてないか を **強制的に意識** させる UX。Slack 連絡は「言ったか言ってないか」を device free に解決
  - **依存関係**:
    - WT-1〜4 は Slack 不要 (in-app のみ) で先行可能 → ここで「連絡待ちモード」 自体は完結する
    - WT-5,6,7 (Slack DM 連動) は **Slack ワンポチでタスク化 entry の OAuth flow が先行必要** (両 entry で `slack_workspace_tokens` / `slack_user_links` を共有)
    - WT-8 は WT-1 後ならいつでも
  - **期待 commit (8 commit、依存順)**:
    1. `feat(item): waiting_for jsonb + service (queue: 連絡待ち WT-1)`
    2. `feat(item): 連絡待ち view plugin — 依頼先別 grouping + 経過日数 (queue: 連絡待ち WT-2)`
    3. `feat(workspace): external contacts table + service (queue: 連絡待ち WT-3)`
    4. `feat(workflow): リマインド worker (cron 1h tick) (queue: 連絡待ち WT-4)`
    5. `feat(slack): DM 送信 service (chat.postMessage wrapper) (queue: 連絡待ち WT-5 / Slack)`
    6. `feat(item): waiting 開始時 Slack DM 自動送信 (queue: 連絡待ち WT-6)`
    7. `feat(workflow): リマインド時 Slack DM 送信 (queue: 連絡待ち WT-7)`
    8. `feat(item): quick-add に「待ち」 toggle + 依頼先 picker (queue: 連絡待ち WT-8)`

---

### 2026-04-30 — Slack ワンポチでタスク化 ★ P0 ★

- [ ] **Slack message から 1 click で saikyo-todo task を作成、message link は description に自動引用** — 分類: 外部統合 (P0、Slack app 設定要)
  - 原文 (2026-04-30): 「Slackワンポチでタスク化できる機能も欲しい!!」
  - **意図 (効率化 + 作業漏れ防止)**: Slack でタスク化したいやり取りが流れる前に拾う。
  - **必要なもの**:
    1. Slack app 登録 (user 側で設定。app manifest を `docs/slack-app-manifest.yaml` に置く)
    2. OAuth flow (workspace ↔ Slack workspace の紐付け、tokens は `slack_workspace_tokens` table に AES 暗号化保存)
    3. Message Action (saikyo-todo にタスク化) ボタンを Slack 側に追加
    4. webhook 受信エンドポイント `/api/integrations/slack/actions` (signature 検証必須)
    5. Slack user → saikyo-todo user の対応表 (`slack_user_links`、初回は email match で auto link)
  - **schema 追加**:
    - `slack_workspace_tokens (workspace_id, slack_team_id, bot_token_enc, app_token_enc, installed_by, ...)`
    - `slack_user_links (workspace_id, user_id, slack_user_id, slack_team_id)`
  - **段階実装**:
    1. schema + repo + 暗号化 helper (1 commit)
    2. webhook endpoint + signature 検証 + Slash command (`/saikyo`) (1 commit)
    3. Message Action → item 作成 (1 commit)
    4. OAuth installer flow + workspace 設定 UI (1 commit)
  - **環境変数**: `SLACK_SIGNING_SECRET`, `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` (空なら全機能 disable)
  - **6 軸スコア**: 可視化 2 / 操作 5 / 認知負荷低減 3 / 作業漏れ防止 5 / やる気 2 / 効率化 5

---

### 2026-04-30 — 相談特化機能 (フォーマット化された quick 相談) ★ P0 ★

- [ ] **チーム内で相談したいときに「背景 / 選択肢 / 期限 / 決めたいこと」フォーマットで投稿、関係者に通知、決定が記録される** — 分類: 機能拡張 (P0)
  - 原文 (2026-04-30): 「相談のフォーマット化とかでサクッと相談したりとか、相談にも特化した機能も作りたい!」
  - **意図 (思考力)**: 雑な「これどうしよう?」を構造化フォーマットに強制 → 相談する側が論点を整理できる。受ける側も判断しやすい。決定が記録に残る。
  - **設計案**:
    - 相談 = 特殊な item kind (`customFields.consultation` jsonb で持つ、専用列 追加せず柔軟に)
    - **フォーマット**: 背景 (markdown) / 選択肢 (1-N 個) / 期限 / 決めたいこと (1 行 question) / 関係者 (= 既存 stakeholders 流用)
    - 関係者は voting 可能、最終決定は requester が「これに決めた」 button で確定
    - 決定すると相談 item は close、決定内容と理由が item description に追記
  - **schema 追加**:
    - `consultation_votes (item_id, option_index, user_id, voted_at)` 中間テーブル
  - **段階実装**:
    1. customFields.consultation 形式の zod + 既存 item 経由で作成 (1 commit)
    2. consultation_votes + service + UI (1 commit)
    3. 相談専用 view tab (1 commit)
  - **6 軸スコア**: 可視化 4 / 操作 5 / 認知負荷低減 5 / 作業漏れ防止 4 / やる気 3 / 効率化 5

---

### 2026-04-30 — Schedule の public / private (バッファ時間モード) ★ P0 ★

- [ ] **Calendar の schedule slot に「公開 / プライベート」を持たせ、private は本人だけに見える** — 分類: 機能拡張 (P0)
  - 原文 (2026-04-30): 「表向きの予定 (公開) と、プライベート予定 (人間ならこういうのやるもん!)。上司や他メンバーに見えないバッファの時間を設定したいときに便利なモード。それがあると学習や前倒しタスクが裏で進めやすくなる。結果的に成果に繋がる。」
  - **意図 (やる気アップ + 段取り力)**: 「学習」「前倒し」のような他人に開示しづらい時間を堂々とブロックできる安心感。表向き予定とのバランス調整も容易に。
  - **設計案 (item_schedules の拡張)**:
    - `item_schedules.visibility text` 列追加 (default `'workspace'` = 全員見える、`'private'` = 本人のみ)
    - RLS SELECT 拡張: `visibility = 'workspace' OR created_by = auth.uid()`
    - Calendar UI: private は鍵 icon + 薄色、本人のみ表示。他 user の view では完全に非表示
    - quick-add に「プライベート」 toggle (デフォルト workspace 共有、checked で private)
  - **段階実装**:
    1. schema migration + RLS 更新 (1 commit)
    2. service / hooks に visibility パラメータ追加 (1 commit)
    3. UI toggle + 鍵 icon 表示 (1 commit)
  - **6 軸スコア**: 可視化 4 / 操作 4 / 認知負荷低減 4 / 作業漏れ防止 3 / やる気 5 / 効率化 4

---

### 2026-04-30 — 関連情報・必要情報への simple アクセス ★ P0 ★

- [ ] **task ごとに関連 doc / 過去議事録 / リンク集を 1 panel で見せる、AI で関連情報を自動収集** — 分類: 機能拡張 (P0)
  - 原文 (2026-04-30): 「関連情報や必要情報に簡単にアクセスできる機能とか。」
  - **意図 (認知負荷低減 + 効率化)**: タスク実行中に「あの doc どこだっけ」「過去どう決めた」を毎回探さない。task の context として固定表示。
  - **設計案**:
    - 既存 `docs` テーブル + `doc_chunks` (HNSW embedding) があるので、task title / description から **意味検索 + tag マッチ** で関連 doc を自動抽出
    - item edit dialog に「関連情報」タブ (auto-suggested + 手動 pin)
    - `item_related_resources (item_id, kind 'doc'|'url'|'item'|'comment', resource_id, label, pinned, score)` 中間テーブル (auto は score 高い順、pinned は手動)
    - 既存 `doc_chunks` semantic search を流用 (Researcher agent と同じ機構)
  - **段階実装**:
    1. schema + repo (1 commit)
    2. auto-suggest service (既存 embedding 流用) (1 commit)
    3. UI tab + pin/unpin (1 commit)
  - **6 軸スコア**: 可視化 4 / 操作 4 / 認知負荷低減 5 / 作業漏れ防止 3 / やる気 3 / 効率化 5

---

### 2026-04-30 — 目標達成サポート + 繰り返しタスク ★ P0 ★

- [ ] **目標 (Goal) を起点に「そのために何をするか」を分解、繰り返しタスクで習慣化、達成度を可視化** — 分類: 機能拡張 (P0)
  - 原文 (2026-04-30):
    - 「目標達成もサポートできるようにしたいんだ。」
    - 「そのためには何をするのかだったり、繰り返しタスクだったりとかもやれるようにしたいし。」
  - **意図 (思考力・段取り力)**: 目標 (週次/月次) → 「そのために何をするか」を AI 補助つきで分解 → 繰り返しタスクで習慣化 → 振り返りで段取り精度向上。設計哲学の本丸。
  - **既存資産との関係**:
    - `personal_period_goals (period day/week/month, period_key, text)` 既存 — UI 強化と AI 分解 hook 追加
    - `templates` 既存 — recurring template に拡張
  - **schema 追加**:
    1. `goal_action_items (goal_id, item_id, weight, created_at)` — goal と それを実現する item を紐付ける中間テーブル (1 goal : N item)
    2. `item_recurrences (item_id, rule_rrule, next_run_at, last_run_at, paused, ...)` — RFC 5545 RRULE で表現 (`FREQ=DAILY;BYHOUR=9` 等)
    3. worker: `pg-boss` の cron job で `next_run_at <= now()` の rule を回し、template から item 生成 → next_run_at を rrule で計算
  - **UI**:
    - goals-panel (既存) に「この目標を実現する task」セクション + 「AI に分解させる」 button
    - item edit dialog に「繰り返し」タブ (rrule builder UI、daily/weekdays/weekly/monthly)
    - dashboard に「目標達成度」chart (週/月で goal x action items の done 比率)
  - **AI 分解 prompt** (Researcher / PM agent の system prompt 拡張):
    - 入力: goal text + 関連既存 item
    - 出力: action item 候補 5-10 件 (title + estimate + 期日提案)
    - 既存 `decomposeItem` パターンと同じ proposal review flow を流用
  - **段階実装**:
    1. item_recurrences schema + worker (1 commit、cron 1 件)
    2. goal_action_items schema + UI 紐付け (1 commit)
    3. 繰り返しタブ UI (rrule builder) (1 commit)
    4. AI 分解 hook (proposal review 流用) (1 commit)
    5. dashboard chart (1 commit)
  - **6 軸スコア**: 可視化 5 / 操作 4 / 認知負荷低減 3 / 作業漏れ防止 5 / やる気 5 / 効率化 5

---

### 2026-04-30 — saikyo-todo UX 卓越憲章 + iter prompt 統合 ★ P0 メタ ★ ✅ iter515 完了

- [x] **UX 卓越の 6 軸を「saikyo-todo の存在目的」として憲章化 + autonomous prompt に評価軸として組込み + 各 view の gap 分析と改善 P0 派生** — 分類: 設計憲章 + プロセス改善 (P0 メタ)
  - **iter515 (2026-04-30) 完了**: `docs/ux-excellence-charter.md` 新規 (6 軸定義 + 良い/悪い例 + trade-off + view 別優先軸 + 13 view × 6 軸 採点表 + a-g との対応 + 運用ルール)、`CLAUDE.md` に「プロジェクト目的 (6 軸)」 section + 読む順番 #2 に憲章を追加、`scripts/autonomous/iter-instruction-autonomous.md` に commit body 6 軸併記ルール追加。派生 P0 は本 file 末尾に view × 軸 単位で 8 件投入 (Today×やる気 / Inbox×可視化 / Kanban×やる気 confetti / Backlog×やる気 / Dashboard×streak / Gantt×認知 zoom / Workflow×可視化 React Flow / Goals×可視化 chart)。
  - 原文 (2026-04-30): 「圧倒的な可視化性能とグラフィカルで直観的な操作方法、認知不可の低減や作業漏れの防止、やる気アップ、効率化に優れたものにするように、タスクを作ってp0に積んどいて。そもそもそういうのを目指すようにプログラムしたいね。」
  - **意図**: 個別 feature を作る前に、saikyo-todo の **目指す方向そのもの** を 6 軸で言語化し、以後すべての iter が **6 軸スコアで評価** されるよう iter prompt / CLAUDE.md に組込む。憲章ができれば「これって saikyo-todo の方向性に合う?」が常に判定できる。

  - **6 軸 (ユーザ表現を尊重 + 1 件 typo 補正済み)**:
    1. **圧倒的な可視化性能** — 状態 / 量 / 関係 / 進捗 / 締切 が 「見て即わかる」。グラフ・色・icon・空間配置で情報密度を上げる
    2. **グラフィカルで直観的な操作方法** — DnD / inline edit / keyboard shortcut / hover で即操作。マウス・タッチ・キーボード で迷わない
    3. **認知負荷の低減** (原文「認知不可」を typo 解釈) — 1 画面に出す情報を整理、smart default、不要な選択肢を出さない、未読バッジで「見るべき場所」を絞る
    4. **作業漏れの防止** — MUST / 期限近接 / blocked 解消 / 依存先 done を能動的に通知。隠れない、忘れない、後回しにできない
    5. **やる気アップ** — 完了時の delight (animation / 音 / 累積カウンタ)、進捗バー、streak、見積達成 toast、視覚的「片付いた感」
    6. **効率化** — keyboard shortcut 網羅 / quick-add / bulk 操作 / template / AI 自動分解 / 賢い default で「クリック数を減らす」

  - **deliverables (cloud agent が plan で生成する成果物)**:
    1. `docs/ux-excellence-charter.md` (150-300 行、新規)
       - 6 軸の定義 + 良い例 / 悪い例 / 既存 feature の自己採点
       - 各 view (Today / Inbox / Kanban / Backlog / Gantt / Dashboard / ItemEditDialog 各タブ / Goals / Sprints) を 6 軸で **5 段階採点** したマップ
       - 既存 UX 卓越基準 a-g (発見可能性 / アクセシビリティ / 状態網羅 / 速度感 / 細部 / レスポンシブ / 一貫性) との関係を整理 (a-g は表面層、6 軸は深層目的)
    2. `scripts/autonomous/iter-instruction-autonomous.md` (or `LOOP.md`) に **6 軸チェック** を追加
       - 各 commit body に「6 軸該当部」を 1 行ずつ書く運用 (該当なしは "n/a")
       - a-g と 6 軸 を併記、a-g は手段、6 軸は目的、と区別
    3. `CLAUDE.md` の冒頭にも 6 軸を「プロジェクト目的」として明示 (新機能を足す前に必ず読む節として)
    4. `FEEDBACK_QUEUE.md` に **各 view × 軸 の改善 P0 entry を派生** 投入
       - 例: 「Today view の 圧倒的可視化 強化 (今日の合計時間 / 残時間 / 見積累積 / 進捗グラフ)」
       - 例: 「Kanban の やる気アップ — 完了時 confetti + 累積完了数表示」
       - 例: 「Backlog の 認知負荷低減 — column 毎の重要度フィルタ default をスマートに」

  - **plan のみ、実装はしない**:
    各派生 P0 は別 iter で消化する。憲章ができた直後の iter ですぐ消化開始 OK。

  - **期待 commit (1 commit でまとめる)**:
    `docs(ux): saikyo-todo UX 卓越憲章 + iter prompt 6 軸統合 (queue: ux-excellence charter)`
    - queue update commit (本 entry を [x] + 派生 P0 を投入)

  - **既存基準との関係**:
    - a-g は **手段層** (どう実装するか)、本 6 軸は **目的層** (何のために作るか)。両方を commit body に書く運用にする。
    - 既存 「もっとグラフィカル / 意味のあるデザイン」 entry (2026-04-28) は 軸 1, 2 と重なる。憲章で吸収 + 個別 P0 派生時に既存 entry も更新。

  - **重要 (cloud agent への注意)**:
    - 軸 3 「認知負荷の低減」 はユーザの「認知不可」を typo 解釈した。憲章で「認知負荷」と表記、原文「認知不可」も注釈で残す。
    - 6 軸は **互いに緊張関係** がある (例: 可視化 ↔ 認知負荷低減、やる気アップ ↔ 効率化)。憲章で trade-off を明示し、view ごとに優先軸を決める。
    - **数値採点** は今の自分の主観で OK、ただし採点の根拠 (具体的な体験例) を 1-2 行ずつ書く。

### 2026-04-30 — TaskChute モード / GTD モード 実装プラン作成 ★ P0 plan ★ ✅ iter516 完了

- [x] **TaskChute (タスクシュート) と GTD の methodology モードを実装する前段の「プラン作成」タスク** — 分類: 設計プラン (P0)
  - **iter516 (2026-04-30) 完了**: `docs/methodology-modes-plan.md` 新規 (12 section / 約 280 行: TaskChute 7 concept + GTD 7 concept + マッピング表 + gap 分析 + 9 P0 candidate + mode switch UX + 6 軸スコア + 既存資産 80%/70% 活用率 + 確認事項 5 件 + 完了条件)。**両 mode の 80%/70% は既存資産で実現可能** が判明 (templates kind='recurring' + schedule_cron は既に動く / time-entry の bias-calibration / daily-streak は流用可 / parent_path で Project 表現可)。派生 P0 9 件 (TC-1〜TC-4, GT-1〜GT-4, MS-1) を本 file 末尾に投入、各 30-150 行 / 1 commit で消化可能。**plan のみ、実装はしない** (queue で各 phase が消化された後に始まる)。
  - 原文 (2026-04-30): 「タスクシュートがしやすいモードとか、GTDがしやすいモードとか、そういうのも頼むよ。プラン作ってもいいけど。そういうプランを作るタスクをp0に入れようか。」
  - **目標**: TaskChute / GTD それぞれの中核 concept を saikyo-todo の既存 feature にマップし、段階実装 phase を切る詳細プランを作成する。プラン本体を `docs/methodology-modes-plan.md` に書き、queue に [x] チェックして次の P0 (= 各 phase の実装) に渡す。

  - **TaskChute mode の中核 (要 plan で詳細化)**:
    - 1 列の **時間軸 linear timeline** (Today view を時刻順に並べる、すべて 1 列)
    - 各 task に **開始時刻 + 所要時間 (実績)** を記録
    - **ルーティン** (毎日/毎週) を template 化、自動 enqueue
    - 終了時刻 = 次 task 開始時刻、累積で「今日終わるか」可視化
    - **見積 vs 実績** の精度 を学習する (既存 `estimate.ts` + `time_entries` + iter254 variance toast 流用)
    - 既存マッピング: Today view + start-timer-button + active-timer-panel + estimate.ts + time_entries + recurring task (要新規)
    - 参考 UI: TaskChute Cloud / TaskChute Cloud 2 (公式)

  - **GTD mode の中核 (要 plan で詳細化)**:
    - 5 step flow: Inbox → Process → Organize → Review → Engage
    - 主要 list: Next Actions / Projects / Waiting For / Someday-Maybe / Reference
    - **Context tag** (@home / @office / @phone / @errands)
    - **Weekly Review** がコア習慣 (リマインダー + checklist)
    - **2-min rule** (2 分以内ならすぐやる) の UI hint
    - Project = "outcome that needs >1 step" (= parent item with subtasks)
    - 既存マッピング: Inbox view + tag-picker (context tag) + parent/subtask 階層 + notification-bell (Weekly Review reminder)

  - **プラン成果物の期待 format**:
    - `docs/methodology-modes-plan.md` を新規作成 (200-400 行、commit 1 件)
    - 構成:
      1. 各 methodology の中核 5-7 concept (上記より深掘り)
      2. 既存 feature との **マッピング表** (TaskChute / GTD x 既存 file / hook / table)
      3. **gap 分析** (新規必要 feature: recurring task / context tag / weekly review reminder / 1 列 timeline view 等)
      4. **段階実装 phase** (各 4-8 件の P0 candidate)
         - phase 1: TaskChute view skeleton (1 列 timeline、既存 today に option 追加)
         - phase 2: 開始/終了 timestamp + 累積表示
         - phase 3: 見積 vs 実績 inline display
         - phase 4: recurring task (新規 schema + worker)
         - phase 5: GTD Inbox view 強化 (5 step flow)
         - phase 6: Context tag (既存 tag を拡張 or 専用)
         - phase 7: Weekly Review (notification + checklist)
      5. **mode switch UX** (workspace settings に「default mode」option、view-switcher に TaskChute/GTD tab 追加 vs 設定で切替 のどちらか)
      6. **既存 user の影響** (mode 未選択時は今まで通り、opt-in)

  - **期待 commit**:
    - `docs(methodology): TaskChute / GTD モード 実装プラン (queue: methodology-modes plan)`
    - 加えて FEEDBACK_QUEUE.md の本 entry を [x] + 実装 phase 別の新 P0 entry を queue に追加

  - **重要**: プランだけで実装はしない。実装は plan の各 phase が個別 P0 として queue に入ってから別 iter で消化する。

  - 関連既存 feature (cloud agent が plan で参照すべき file):
    - `src/components/workspace/today-view.tsx` (TaskChute timeline の base)
    - `src/components/workspace/inbox-view.tsx` (GTD Inbox の base)
    - `src/features/item/estimate.ts` + `src/features/time-entry/*` (見積 vs 実績)
    - `src/components/workspace/start-timer-button.tsx` + `active-timer-panel.tsx` (TaskChute の start/stop)
    - `src/components/workspace/tag-picker.tsx` (GTD context tag の base)
    - `src/features/notification/*` (Weekly Review reminder の base)
    - `src/lib/db/schema/item.ts` (recurring task 追加検討、別 table or item 拡張)

### 2026-04-30 — 並び替え 根本設計 他社比較 + 改善 ★ 新規 ★

- [ ] **並び替え (DnD reorder) を Notion / Linear / Asana / Trello / TickTick と比較し根本見直し** — 分類: 設計議論 → 段階実装
  - 原文: 「並び替えが思い通りの場所に行かない / 多分ほかのタスク管理ツールの実装とかと比べた方がいい。根本的になんかおかしい」
  - **現状の問題 (a93ef84 の表面 fix では足りない可能性)**:
    - position 重複検知 + bucket rebalance は実装済 (b3f75ba)
    - sort 関数の display ↔ drag handler の不一致は fix 済 (a93ef84)
    - しかしユーザは「**根本的になんかおかしい**」と感じている → アーキテクチャ自体を疑う
  - **業界標準パターン比較** (調査タスク):
    | tool | reorder model | 同期方式 | 楽観 update |
    |---|---|---|---|
    | **Notion** | block fractional position (LSEQ-like) | sync via Yjs CRDT | optimistic |
    | **Linear** | sortOrder (float64) + auto rebalance cron | event sourcing | optimistic, rollback on conflict |
    | **Asana** | parent + before/after pointer (linked list) | optimistic + retry | server resolves order |
    | **Trello** | float position + drift correction | optimistic | rebalance on collision |
    | **TickTick** | sortOrder (long) + manual rebalance | optimistic + ack | snap to integer grid |
    | **GitHub Projects v2** | sortOrder (positionalDouble) | optimistic + auto rebalance | hidden conflict |
  - **saikyo-todo 現状**:
    - `fractional-indexing` lib (LSEQ-like) で base62 string position
    - 同期は TanStack Query invalidate (poll-based、 Realtime 未配線)
    - 楽観 update は `useOptimisticUpdate` 一部のみ
    - rebalance は collision 検出時のみ (bucket 単位)
  - **比較で見える gap**:
    - (1) **楽観 update が DnD で完全じゃない**: drag → server commit → invalidate → re-render の遅延で 「動いた」感が薄い
    - (2) **conflict resolution が unclear**: 2 user が同時 reorder で どっちが勝つか UX 不明
    - (3) **rebalance trigger が collision 時のみ**: 普段は遅延で OK だが、頻繁な reorder で fractional string が長くなる (e.g. 'a0V' → 'a0Vk' → ...)、cleanup なし
    - (4) **Realtime を使ってない**: Notion/Linear のような「他人の reorder が即見える」が無い
  - 設計案 3 scope:
    - **A (即効、1-2 commit)**: drag end 時の **immediate optimistic UI update** を強化、TanStack Query setQueryData でキャッシュを先に書換、サーバ commit 待たずに新順で render。失敗時のみ rollback + toast。
    - **B (中期、3-5 commit)**: Realtime channel 経由で reorder event を broadcast、他 user に即反映。conflict は last-write-wins で server 側 audit に残す。
    - **C (大規模)**: CRDT (Yjs / Automerge) で完全 P2P 並列編集対応 (Notion 並)。POST_MVP 寄り。
  - **要追加質問**:
    - (a) 楽観 update の rollback 動作 — 「動いて戻る」 (= drag が見えない時間あり) か 「toast だけ」 (= drag は維持、エラー通知だけ)?
    - (b) Realtime presence (誰が今 reorder してるか avatar 表示) は 必要 / POST_MVP どっち?
    - (c) fractional-indexing の長さが 16 char 超えたら自動 rebalance cron 入れる?
    - (d) 並び替え race の last-write-wins か、merge resolution UI か?

### 2026-04-30 — モバイル / スマホ表示 全面改善 (潰れ / overflow / touch UX) ★ 新規 ★

- [ ] **スマホ表示が全体的に いけてない / 潰れる箇所がある を 全 view で 棚卸し + 段階修正** — 分類: UX (大、横断的)
  - 原文: 「スマホ表示が全体的にいけてない。潰れたりもするし」
  - 仮解釈:
    - 320-414px (iPhone SE / 13/15 系) で破綻している view を **片端から探索 → 修正**
    - iter104/107/109 で Kanban / Dialog の overflow / svh fix は実施済だが、それ以降に追加された
      view (Sprint / Goal / Workflow / Integration / TimeEntry / Subtasks panel / etc) は本格的な
      モバイル audit を経ていない可能性
  - **想定不具合 (チェックリスト)**:
    - layout 潰れ:
      - flex / grid が 320px で wrap せず横スクロール
      - text の `truncate` が効かず親 width を超えて押し出す
      - table が cell を `min-w-` で固定して横スクロール
      - dialog の max-w が画面より大きい (iter104 fix の漏れ)
      - sticky header の z-index が他要素と衝突
      - bottom nav と active-timer-panel が重なる
    - touch UX:
      - click target < 44x44px (icon button が 32px などで親指タップ難)
      - hover-only のツールチップが mobile で見えない
      - DnD の長押し timeout が短い / スクロール誤発動
      - swipe 系操作が無い (TickTick は swipe で完了 / 削除)
    - 入力:
      - keyboard に inputMode hint 不足 (一部 iter で対応済、漏れ確認)
      - 仮想キーボード起動時に input が画面下に隠れる
      - IME 中 Enter で誤送信 (`IMEInput` 漏れ箇所あれば修正)
    - 視覚:
      - chip / badge の text が hyphenate せず溢れる
      - subtask 番号 + status icon + title で 320px が破綻
      - Gantt / swim-lane が横スクロール必須なのに hint 無し
  - 進め方 (1 view = 1 commit、5-30 行 fix、playwright iPhone 13 emulation で前後確認):
    - **scope A (探索 + 修正のセット iter)**: playwright trigger と統合、iPhone 13 (390x844) 専用
      script を新設、各 view で「DOM が viewport 内収まるか」「click target が 44x44 以上か」
      「overflow:hidden で text 押し出し無いか」を assert、見つけ次第 fix。
    - **scope B (横展開)**: scope A で見つけたパターンを 全 view 横展開 (例: chip text-truncate を
      全 chip に適用、table を `overflow-x-auto + min-w-0` rules に統一)
    - **scope C (リッチ化)**: bottom nav 追加 / swipe 操作 / floating action button (FAB) で
      QuickAdd 主要機能の片手アクセス
  - 既存資産:
    - playwright-iter で既に「mobile keyboard hint」「<main> tabIndex」等の a11y 改善が走っている
      (iter401-405 系) → 本件は同じ playwright trigger に **モバイル emulation 専用 iter** を
      hint として誘導すれば自然に消化される
    - iter103 の long-press DnD、iter104 の Kanban overflow、iter107 の html-body clip は基盤
  - **要追加質問** (仮置きで進める):
    - (a) primary device — iPhone 系 (390/430)? Android 系 (360/412)? → 仮: iPhone 13 (390x844)
      を主、iPhone SE (375x667) を min target
    - (b) bottom nav 追加 — 必須? 当面 hamburger menu 維持?
    - (c) FAB (浮動アクション button) を入れる? 入れるなら QuickAdd / 計測開始 / 検索 のどれ?
    - (d) swipe 操作 — 完了 (Today で swipe right) / 削除 (swipe left) / 編集 modal (swipe up)?
  - 関連既存 candidate:
    - playwright explore script (`scripts/explore-uiux-runner.ts`) は viewport 切替可能 → mobile mode 専用 script を
      `scripts/explore-uiux-mobile-<view>-iter<N>.ts` で連番作成すれば自然に検出 + commit に至る

### 2026-04-30 — 自前実装 → ライブラリお着替え 棚卸し ★ 新規 ★

- [ ] **既存自前実装を確立 ライブラリに段階的 移行 (品質 + メンテ性 向上)** — 分類: 設計議論 → 段階実装
  - 原文: 「ここいらで、ライブラリ使えるところはライブラリにお着替えしようか。きっと自前実装よりええやろ？」
  - **方針**: CLAUDE.md 「ライブラリ・モリモリ主義」 (memory:feedback_libraries_first) と整合、
    **自前小実装 → 業界標準ライブラリ** に置換するチャンス棚卸し
  - 候補 (現状 self-implemented vs 確立 lib):
    | 領域 | 現状 (自前) | 候補 lib | 採用効果 |
    |---|---|---|---|
    | DAG editor | JSON textarea (workflows-panel) | **React Flow / @xyflow/react** | drag&drop / port 結線 / minimap (本ファイル別 entry) |
    | Gantt 描画 | gantt-view.tsx 583 行 (自前 SVG bar + 線) | **frappe-gantt** / **gantt-task-react** / **dhtmlx-gantt (free)** | DnD resize / 期間 click / scroll virtualize built-in |
    | Mind map / tree | 無し | **react-d3-tree** / **react-flow** | subtask graph 視覚化 (queue 別件 graphical 波及 と協調) |
    | Markdown editor | BlockNote 既導入 | (既に 確立 lib) | n/a |
    | Date picker | 無 (HTML date input) | **react-day-picker** / **shadcn DatePicker** | 範囲選択 / locale / disabled 日付 |
    | Color picker | 無 | **react-colorful** | tag 配色 / member avatar 色 |
    | Drag & drop | @dnd-kit 導入済 | (既に 確立 lib) | n/a |
    | Toast | sonner 既導入 | (既に 確立 lib) | n/a |
    | Form | react-hook-form 既導入 | (既に 確立 lib) | n/a |
    | Table | TanStack Table 既導入 | (既に 確立 lib) | n/a |
    | Virtualization | TanStack Virtual 既導入 (一部) | 全 list view に拡張 | 大量 item で fps 維持 |
    | Charts (PDCA / dashboard) | 自前 div bar (PDCA DailyBars 等) | **recharts** / **chart.js with chartjs-react** | annotation / hover / export |
    | Calendar view | 無し (POST_MVP) | **FullCalendar** / **react-big-calendar** | 月/週/agenda の 3 view 込み |
    | i18n | 無し (現状 日本語 hardcode) | **next-intl** | EN/JP 切替 / locale-aware date |
    | a11y test runner | 自前 explore-uiux script | **axe-core** / **playwright-axe** | WCAG 違反 自動検出 |
  - 進め方 (1 候補 = 1 iter ペース、queue track):
    - iter1: 棚卸し最終確定 (本リスト のうち どこを着替えるか user 判断、不要候補は除外)
    - iter2-: 1 候補 = scope A (lib 導入 + 最小 1 view 移植) → scope B (全 view 横展開) の 2-3 commit ずつ
  - **要追加質問** (仮置きで進める):
    - (a) Gantt はどれ? frappe-gantt 軽量 / gantt-task-react 高機能 / dhtmlx 商用 free
    - (b) Charts は recharts / chart.js / d3 直接? recharts 推奨 (shadcn 親和性)
    - (c) Calendar は POST_MVP 寄り、入れる?
    - (d) i18n は社内利用 (日本語のみ) なので不要? 英語業務委託あれば必要?
    - (e) lib 追加で bundle size 大きくなるが OK? (Next.js code split で各 page 局所化)
  - 推奨着手順 (impact 大 / 工数小 から):
    1. **React Flow** (Workflow graphical、本ファイル別 entry P0 と統合) ★最大 impact
    2. **recharts** (PDCA / dashboard / member capacity 等の chart 統合)
    3. **gantt-task-react** (gantt-view.tsx 全置換、queue「Gantt DnD」と統合)
    4. **react-day-picker** (date input UX 改善、軽量)
    5. **playwright-axe** (a11y 自動検出、QA loop と統合)

### 2026-04-30 — Workflow 機能を graphical 化 (React Flow 等 ライブラリ採用 OK) ★ 新規 ★

- [ ] **Workflow editor を JSON textarea から graphical (DAG visual editor) に置き換え** — 分類: 実装要望 (大、外部ライブラリ採用前提)
  - 原文: 「ワークフロー機能をもっとグラフィカルに頼むわ。他のライブラリ使ってもいいし」
  - 仮解釈:
    - 現状 `WorkflowEditorDialog` の graph / trigger は **JSON textarea で手書き** (iter118 で実装、JSON の zod parse のみ)
    - これを **React Flow (= xyflow/react)** ベースの DAG visual editor に置換:
      - ノードを drag&drop で配置 (palette から選ぶ)
      - エッジは drag で結ぶ (1 ノード port → 別ノード port)
      - ノード type 別配色 (noop/http/ai/slack/email/script、subtask-status と同 graphical pattern)
      - ノード設定パネル (右 sidebar、選択 ノードの config を form で編集)
      - 保存時に React Flow state → 既存 `WorkflowGraphSchema` JSON へ変換
  - 既存資産 (流用):
    - `workflows-panel.tsx` (847 行、editor dialog 含む)
    - `WorkflowGraphSchema` / `WorkflowTriggerSchema` (zod)
    - workflow engine (Kahn topological sort、5 node type 実装済)
    - 自然な migration: JSON textarea を fallback に残しつつ visual を default に
  - 推奨ライブラリ:
    - **React Flow / xyflow/react** (de facto standard、TypeScript 完備、active maintenance、shadcn と相性良い)
    - 代替: `reactflow` (旧 paquete name)、`react-flow-renderer` (deprecated)
    - 不採用: `dagre-d3` (描画のみ、edit 不可)
  - 設計案 3 scope:
    - **A (最小、3-5 commit)** ✅ **完了 (2026-04-30、ユーザ「今すぐ!」割込み 1 commit)**:
      1. ✅ `pnpm add @xyflow/react` (12.10.2) — install 完了
      2. ✅ pure helper `react-flow-bridge.ts` (`workflowGraphToFlow` / `flowToWorkflowGraph`) +
         dagre 風 auto-layout (depth × type column) + 11 unit test pass
      3. ✅ Read-only viewer `WorkflowGraphCanvas` 実装、WorkflowEditorDialog の上部に「視覚プレ
         ビュー」 section として配置。JSON textarea 編集に即時 follow (best-effort parse、不正
         中は直前の有効 graph を keep)。node type 別配色 (8 type)、空 graph は EmptyState、
         5 node 超で MiniMap 出現、attribution hideAttribution で MIT 尊重しつつ noise 削減
    - **B (中、5-10 commit)**: 4. Drag&drop でノード作成 (palette toolbar + dnd-kit と統合 or React Flow native) 5. Edge drawing (port → port)、cycle detection は engine 側既製を流用 6. 右 sidebar でノード設定編集 (config を node type 別 form で) 7. 保存 button で React Flow state → JSON → action.update
    - **C (大)**: workflow run 中の execution status を Canvas 上に live highlight (pending/running/done/failed を node 色で)
  - **要追加質問** (仮置きで進める):
    - (a) JSON textarea を完全に置換? それとも tab で切替可能 (advanced 用)?
    - (b) layout — 自動配置 (dagre auto-layout)? それとも user が drag 配置?
    - (c) palette ノード type — 5 種類すべて? それとも MVP で noop+http+ai だけ?
    - (d) read-only と edit の境界 — workflow.enabled 中は edit 禁止?
  - 関連既存 candidate:
    - HANDOFF iter118 系で「次 iter で React Flow ベース graph editor」と予告あり、本件はその実現
    - subtask graphical (Sprint swim-lane) と DAG エンジンの dual concern (両方 React Flow で書ける)

### 2026-04-30 — AI 自動実行モード (assignee=AI + plan 承認 + Slack escalation) ★★★ P0 最優先 ★★★

- [x] **scope A 完了 (iter506-513、計 8 commit)** — 担当者を AI に割当 → 「Plan を生成」 button → Researcher が Plan を comment に post (🤖 marker 付き)。iter506: ai-assignee judging 6 helper / iter507: listByWorkspace + label 変換 / iter508: listAgentsAction + useWorkspaceAgents + toggle helper / iter509: AssigneePicker AI 選択肢 / iter510: agent-plan-prompt builder / iter511: researcherService.generatePlanForItem / iter512: generatePlanAction + useGeneratePlan + canGeneratePlan / iter513: ItemPlanGenerateButton + ItemEditDialog 配線。env (ANTHROPIC_API_KEY) 不要、累計 60 unit test PASS。scope B (承認/却下 button + 自動実行 cloud sandbox + Slack escalation) は別 entry。
- [ ] **担当者 = AI に割当 → plan mode で「こうやるけどええか?」と確認 → 承認後 自動実行 → 困ったら Slack 相談 / escalation** — 分類: 実装要望 (大、AI + workflow + Slack 統合の中核)
  - 原文: 「自動実行モード搭載して。モードというか。担当者をAIにできる。そしたらプランモードでこうやるけどええか？って聞かれる。エスカレーションとか相談はSlackで」
  - **ユーザ強調**: 「優先度高く実装頼む」
  - 仮解釈:
    - Item.assignee に **`'ai-engineer'` / `'ai-researcher'` の特殊値** を許可 (or `assignee_kind: 'ai' | 'user'` 列追加)
    - assignee=AI な item を pg-boss キューが拾う → Researcher Agent で **plan を生成** → comment に「実行計画 (案)」として post + 承認 button
    - 承認 click → Engineer / Researcher Agent が自動実行 (既存 Engineer service / claude CLI subprocess を流用)
    - 実行中 stuck (test fail / 仕様不明) → Slack に escalation message + ItemEditDialog の comment にも残す → 人間 reply 待ち or fallback
    - 完了 → status=done + 実行ログを comment に残す
  - 既存資産 (流用ベースが豊富):
    - Engineer Agent (`engineer-service.ts` / `engineer-worker.ts` / cloud sandbox 経由 claude CLI subprocess)
    - Researcher Agent (Anthropic SDK 直叩き、staging proposal の経験あり)
    - Slack MCP (`mcp__slack__slack_send_message` 等) + `dispatchSlack` helper
    - Workflow engine (ai / slack / email / script node、approval flow を node graph で組める)
    - Comment thread (item ごとの `comments` table、AI コメントは `actor_type='agent'`)
    - `decompose-proposals-panel.tsx` (staging UI patternの参考、承認/却下 picker 既製)
    - Cost budget (`cost-budget.ts`、AI 起動の monthly cap、暴走防止)
  - 設計案 3 scope (段階実装):
    - **A (最小、3-5 commit)**:
      1. schema: `items.assignee_kind` enum 追加 (`'user' | 'ai-researcher' | 'ai-engineer'`)、UI で assignee picker に「AI」選択肢
      2. assignee=AI な item で「Plan 生成」 button → Researcher が短い計画を生成 → comment として post (auto-implement なし、ユーザは見るだけ)
      3. comment に「✓ 承認 / ✗ 却下」 button (decompose-proposals 同パターン)
    - **B (中、5-10 commit)**: 4. 承認 → pg-boss job enqueue → Engineer service が cloud sandbox で実行 → diff を comment + main へ commit (既存 cloud-engineer-adapter 流用) 5. 失敗時 (test fail / lint fail) → Slack 通知 + comment に "stuck: <理由>"、status を blocked に 6. cost cap で月次 上限 + 1 item あたり 上限 (既存 `cost-budget` 拡張)
    - **C (大、長期)**: 7. AI 同士の会話 (Engineer ↔ Researcher で plan の妥当性議論) 8. plan diff preview (実行前に「この行を変える予定」を highlight) 9. Slack 双方向 (Slack 上で承認/却下 reply で control)
  - **段階目標 (本 P0 hoist の対象 = scope A)**:
    - iter1: schema migration `0XXX_assignee_kind.sql` + drizzle schema 同期 + zod schema 拡張 + 1 unit test
    - iter2: AssigneePicker UI に「AI Researcher / AI Engineer」選択肢追加 + repository / service の filter 対応
    - iter3: ItemEditDialog から「Plan を生成」 button (AI assignee 時のみ表示) + Researcher 起動
    - iter4: Plan を comment にレンダリング + 承認/却下 button (pure helper + small UI)
    - iter5: 承認後の Slack 通知 (まずは「Plan 承認されました」を Slack 投稿、自動実行は scope B)
  - **要追加質問** (仮置きで進める):
    - (a) AI assignee の identifier — system user として `users` に行を作る? それとも特殊文字列? → 仮: `users` に `kind='agent'` の system user 1 件 (既存パターンと整合)
    - (b) plan 承認権限 — 任意 member? それとも作成者 / admin のみ? → 仮: 作成者 + admin (Item 作成権限と同等)
    - (c) Slack channel — workspace settings に「AI escalation channel」 1 個 を保存? それとも item ごと? → 仮: workspace settings に 1 個固定
    - (d) 自動実行の cancellation — 開始後 user が「やめろ」 を送ったらどう止める? → 仮: 既存 cancellation token (engineer service にあり) を使う
    - (e) AI が依存解決できない時の 振る舞い — エスカレーション後 タイムアウトしたら? → 仮: 24h タイムアウトで status=blocked + assignee を作成者に戻す
  - 制約 (重要):
    - **Cloud env で Anthropic CCR sandbox から Engineer の cloud-sandbox が動くか未検証**。scope A は AI が plan 生成のみ (auto-implement なし) なので比較的安全
    - cost budget は既存 `cost-budget.ts` で workspace 月次キャップ (scope B 移行時に必須拡張)
    - Slack は既存 MCP / dispatchSlack で送信のみ (双方向は scope C)

### 2026-04-30 — Sprint 担当者 swim-lane Gantt ★ 新規 ★

- 🚧 **Sprint ごとに 担当者を縦に並べる Gantt 風ビュー (誰が何を いつ するか)** — 分類: 実装要望 (中-大)
  - 進行中 (iter468 で swimlane substrate 着地、次 iter で SprintCard UI 配線)
  - [x] iter468 (b8b04c5): pure helper `computeSwimlaneBarPosition` + `groupItemsByAssigneeKey<T>` (sprint 期間内 % position 計算 + clip + 未割当 lane + actorType 衝突回避) + 15 test
  - [x] iter470 (a840c91): pure helper `detectLaneConflicts` + `collectConflictedItemIds` + `formatLaneConflictsJa` (同 lane 内 時間重複検出 + UI 逆引き + chip 整形) + 16 test。これで substrate は computeSwimlaneBarPosition / groupItemsByAssigneeKey / detect / collect / format の 5 helper 揃い、UI bind は 1 commit 見込み。
  - [ ] 次: SprintCard disclosure 「担当者ビュー」 配線 (上記 5 helper を chain で呼ぶだけ)
  - 原文: 「スプリントごとに、担当者を縦に並べて何をするかをわかるような機能 (がんと的な)」
  - 仮解釈:
    - sprint detail ページに新 view 「assignee swim-lane」 を追加
    - **Y 軸**: workspace member 1 行 / 1 swim lane (avatar + 名前)、未 assignee は「未割当」 lane
    - **X 軸**: sprint 期間 (`startDate` → `endDate`、典型 14 日)
    - 各 item を 該当 assignee の lane に bar として配置 (start = scheduledFor、end = dueDate、長さ = estimateMinutes 由来)
    - 同 lane 内で時間重複があれば「conflict 警告」 (同時並行不可な場合)
    - lane の合計 estimateMinutes を 上端に表示 → capacity overflow 検知 (= queue 別件「余裕時間 一覧」と協調)
  - 既存資産:
    - `sprints-panel.tsx` (786 行、`SprintCard` で sprint 一覧)
    - `gantt-view.tsx` (583 行、bar render / SVG 線描画 / critical path)
    - `useWorkspaceMembers` (member 一覧)
    - `extractEstimateMinutes` (description から 見積分数)
    - subtask-status.ts / status-visual.ts (graphical 配色)
  - 設計案 3 scope:
    - **A (最小)**: SprintCard に新 disclosure「担当者ビュー」、HTML/CSS grid で row=member × col=日 で簡易表 (bar は `<div>` で width = duration / sprint length × 100%)
    - **B (中)**: A + sprint period 内の item を assignee で group + sort、未 assignee lane 別、status 配色 (subtask-status helper 流用)、合計 estimate vs capacity 8h × N day を chip 表示
    - **C (大)**: B + DnD で lane 間 移動 (assignee 変更) + bar resize で期間調整 (queue 別件「Gantt DnD」と統合) + click で ItemEditDialog
  - 既存制約 (考慮):
    - sprint length は workspace_settings の `sprint_default_length_days` (default 14)
    - estimate が無い item の bar 長 — 1 day default? 表示しない?
    - sprint 期間外の dueDate を持つ item — clip して表示? 別 box?
  - **要追加質問**:
    - (a) 表示 placement — sprint detail の新 tab? sprint 一覧の inline disclosure?
    - (b) capacity 計算は member 別? workspace default 8h × N day?
    - (c) 未 assignee lane を表示? 隠す (filter)?
    - (d) sprint 期間外の item の扱い (例: dueDate が sprint 終了後)
  - 関連既存 candidate:
    - `gantt-view.tsx` を「assignee 軸」モードで再利用するのが工数最小 (item × time → item × member × time)
    - `personal-period-view.tsx` の period filter ロジックは流用可能

### 2026-04-29 — Template 登録機能 (タスク + サブタスクをまとめて) ★ 新規 ★

- [x] **Template 登録機能 — タスク + サブタスクをまとめて 1 つの Template として登録、再利用** — 分類: 実装要望 (中-大)
  - **scope A 完了 (iter460 → 462、3 commit)**:
    `e75e53f` (substrate) → `fd9da3a` (service+action) → `6893fe7` (hook+UI button)。
    ItemEditDialog の「Template として保存」 ghost button から 1 click で parent +
    全子孫 (深い階層 OK) を Template 化。再利用は既存 templateService.instantiate
    で同階層に展開。scope B (drag&drop 編集 + preview) / C (AI 提案) は別 entry。
  - 原文: 「テンプレート登録機能。タスクとサブタスクをまとめて登録できる」
  - 仮解釈:
    - 既存 `templates` table (Phase MVP の Template 機能) を拡張、または UI のみ追加
    - parent task 1 件 + child subtask N 件 を 1 Template として保存
    - 「Template から create」 button で workspace に instance 化 (新 Item として子孫含めて投入)
    - 名前 / 説明 / category (PJ start / week start / etc) で管理
  - 既存資産:
    - `src/features/template/` (Phase MVP で実装済 — Template foundation)
    - `src/components/workspace/templates-panel.tsx` 等で UI ある
    - `subtasks-panel.tsx` の bulk add (`parseBulkSubtaskTitles`) は流用可能
    - ltree path `parent_path` で子孫の階層を保持できる
  - 設計案 3 scope:
    - **A (最小)**: ItemEditDialog から「この Item と subtask を Template に保存」 button → 既存 templates テーブルに JSON で {parent, children[]} を保存。create 時に bulk insert
    - **B (中)**: /<wsId>/templates 画面で Template 編集 UI (drag&drop で順序変更、subtask 追加/削除)、preview pane
    - **C (大)**: AI 提案 — 過去の似た Item 集を analyze して Template 候補を提示、ボタン 1 つで保存
  - **要追加質問**:
    - (a) 既存 Template 機能 (Phase MVP) との関係 — 拡張? それとも別 entity?
    - (b) 階層 — subtask の subtask まで再帰的に保持?
    - (c) Template 起動時 — parent + child を一気に作るか、1 件ずつ確認するか?

### 2026-04-29 — 案件の現状 + 着地プラン を 一目で分かる panel ★ 新規 ★

- [x] **「この案件、今どんな感じ？」「どう着地させるつもり？」を 1 画面で一目化** — 分類: 実装要望 (中-大、AI 寄り)
  - **scope A 完了 (iter463 → 464、2 commit)**: `6a1533d` (substrate `findLatestUpdatedAt` +
    `formatLatestActivityJa`) → `dd5513a` (ItemSummaryPanel + 新 tab「サマリ」 配線、3 chip
    既存 substrate 統合: descendants-progress / dependency-readiness / latest-activity)。
    ItemEditDialog を開いた直後 base tab の隣に「サマリ」 tab、進捗 / 依存 / 動き の 3 軸を
    1 画面で確認可能。scope B (risk score / 着地予測 / dueDate 集約) / C (AI 自動要約) は別 entry。
  - 原文: 「『この案件、今どんな感じ？』『どう着地させるつもり？』というのが一目でわかるものにしたい」
  - 仮解釈 (parent Item / プロジェクト粒度の視覚 status):
    - **現状 sec**: 進捗 % (subtask done / total)、in_progress 子の数、blocked 子の数、直近 7 日の commit/comment 件数、最終 update 時刻
    - **着地 sec**: 予定 end (子の dueDate 最遅 or critical path、ガント連携)、risk score (overdue 子比率 + blocked 比率 + 最終 update からの経過)、AI 1 段落要約 ("残 5 タスク中 3 件は X、ボトルネックは Y、来週金曜着地予定")
    - **次の動き sec**: AI が「次にやるべき 3 件」を picking + 担当者 suggest
  - 既存資産:
    - `subtask-status.ts` (status helper)
    - `formatDependencyReadiness` / `summarizeDependencyReadiness` (依存タブで実装済の readiness 集約)
    - `gantt-view.tsx` の critical path 計算 (`computeCriticalPath`)
    - `dashboard-view.tsx` (workspace 全体の bird's-eye)
    - Researcher Agent (Anthropic SDK 経由で要約生成済の経験あり)
  - 設計案 3 scope:
    - **A (最小)**: ItemEditDialog に新 tab「サマリ」を追加、subtask 進捗 + readiness + 直近 activity を pure helper で集約 (AI 不使用、即実装可能 30-50 行 / 1-2 commit)
    - **B (中)**: A + 着地予測 (critical path / 残 estimate sum / 過去 bias で校正) + risk score chip
    - **C (大)**: B + AI 自動要約 (Researcher Agent で 1 段落生成、cost 制御で週 1 更新 cron)
  - 表示 placement 案:
    - (i) ItemEditDialog の新 tab (Item 単位で見たい時)
    - (ii) Kanban カード上部の disclosure (一覧上で軽く見たい時)
    - (iii) /dashboard の「進行中案件」 panel (workspace 横断で見たい時)
    - 推奨: まず (i) から、次に (iii) に展開
  - **要追加質問**:
    - (a) 「案件」の単位は parent task か、AI 自動 cluster か、Goal/Sprint 単位か?
    - (b) 「着地予測」は date 一発? それとも信頼区間 (P50/P90)?
    - (c) AI 要約の更新頻度 — リアルタイム / on demand / 日次 cron?
    - (d) risk score の閾値 — 緑/黄/赤 の境界値はチーム判断? デフォルトプリセットあり?
  - 関連既存 candidate:
    - 「依存タブの readiness chip」(iter306 で実装済) は本機能の縮小版に近い、それを Item 全体のサマリに昇華するイメージ

### 2026-04-29 — チームメンバーの余裕時間 ぱっと一覧 ★ 新規 ★

- [ ] **各チームメンバーの今日 / 今週の余裕時間を 1 画面で 一覧表示** — 分類: 実装要望 (中)
  - 原文: 「各チームメンバーが今日、今週、どれくらい余裕な時間があるのかなども見れるようにしたい。ぱっと」
  - 仮解釈:
    - workspace の全 member を 1 画面に並べ、各 member の **今日 / 今週の利用可能時間 vs 既割当 estimateMinutes 合計** を progress bar / chip で可視化
    - 「赤=オーバー / 黄=ギリ / 緑=余裕」を色分け (graphical 波及シリーズと整合)
    - assignment / 期日変更時に即時反映 (TanStack Query で member 別に invalidate)
    - 「割り振りすぎ」検知 → 余裕ある member への移管 suggestion
  - 計算式 (案):
    - working hours = 1 日 8h (member 別に上書き可、workspace_settings に default_member_capacity_minutes を将来追加)
    - 今日の used = 今日の dueDate / scheduledFor を持つ未完了 Item の estimateMinutes 合計 (assignee=該当 member)
    - 今週の used = 今週 ISO 週内の同上 (5 営業日 × 8h = 40h)
    - 余裕 = capacity - used、負なら overload
  - 既存資産:
    - `extractEstimateMinutes` (description から 見積分数 取出、iter255 で pure 化)
    - `workspaceMemberRepository` (member 一覧)
    - `personal-period-goal` の daily/weekly view ロジック (期間 filter)
    - `time_entries` (実測値、見積精度の校正に使える)
  - 設計案 3 scope:
    - **A (最小)**: workspace home に「余裕時間」 panel、各 member 1 行 (avatar + 今日 chip + 今週 chip)、見積無し Item は計算除外
    - **B (中)**: A + 詳細 modal (member click → 今日の Item 一覧 + estimate 詳細 + 過去 N 週の actual vs estimate bias)
    - **C (大)**: B + drag&drop で他 member へ Item 移管、AI suggestion (「田中さんが overload、佐藤さんが余裕、移管しますか?」)
  - **要追加質問**:
    - (a) 見積が無い Item をどう扱うか? 「未見積」counter で別表示? AI 自動見積で穴埋め?
    - (b) capacity は 1 日 8h 固定 or member 別設定? 半休/休暇 (Calendar 連携) も考慮?
    - (c) 「今週」の境界 — ISO 週 (月-日) / 業務週 (月-金) どちらが priority?
    - (d) MUST item は別カウント? capacity から優先で引く?
    - (e) Slack 通知 — 「明日 overload です」を朝 8 時に出すか?
  - 既存に近い候補:
    - Dashboard view (`/<wsId>/dashboard`) に member 別 panel を追加するのが自然
    - Personal Period View (`/<wsId>/<period>`) は "自分用" 画面なので、team 用は新画面 `/<wsId>/team-capacity` or Dashboard 拡張

### 2026-04-29 — Gantt DnD で期間を直接編集 ★ 新規 ★

- [ ] **Gantt bar を DnD で move / resize、依存タスクごとまるまるシフト** — 分類: 実装要望 (大)
  - 原文: 「ガントチャートの期間を直接ドラッグアンドドロップで移動・スタート位置やエンドの位置を自由に変えられたり、依存タスクごとまるまるずらせたり」
  - 仮解釈 (TeamGantt / GanttPRO 並 UX):
    - (1) **bar 中央を drag** → start/end を平行 shift (期間維持)、dueDate / scheduledFor を update
    - (2) **bar 左 edge を drag** → start のみ変更 (resize)、scheduledFor だけ update
    - (3) **bar 右 edge を drag** → end のみ変更 (resize)、dueDate だけ update
    - (4) **Shift+drag (or 「依存ごと」 mode toggle) で前提/後続もまとめて shift** — `useWorkspaceBlocksDependencies` で依存 graph 取得 → 自分 + 後続 (transitive closure) を一括 update
    - (5) snap to day boundary、drop 時に楽観ロックで update mutation、競合時は toast + revert
  - 既存資産:
    - `gantt-view.tsx` (583 行、bar render は既に role=button + keyboard 対応済 iter99)
    - `GanttDependencyArrows` (SVG 線描画)
    - `useWorkspaceBlocksDependencies` (workspace 横断 dep 取得)
    - `@dnd-kit` 既導入 (subtasks / backlog で使用、Gantt bar にも適用可)
    - `itemService.update` で楽観ロック付き dueDate / scheduledFor 変更可能
  - 設計案 3 scope:
    - **A (最小)**: bar 中央 drag → 期間平行 shift だけ実装 (左右 edge / 依存連動は後)
    - **B (中)**: A + 左右 edge drag (resize) + snap to day grid + visual feedback
    - **C (大)**: B + Shift+drag で transitive closure shift + critical path 強調更新 + collision 警告
  - 既存制約 (考慮):
    - cell width は zoom level (週/月) で可変、DnD は pixel→day 変換が必要
    - 楽観ロックで version 不一致 → revert → conflict toast
    - subtask の parent shift は連動するか? (`itemService.move` か別 logic か)
  - **要追加質問**:
    - (a) Shift+drag の依存連動範囲 — 直接の後続のみ? 全 transitive? Critical path のみ?
    - (b) drag 中の visual — 半透明 ghost? 元位置に reset アニメーション (失敗時)?
    - (c) day 未満の resolution は許容? (現状 dueDate / scheduledFor は date 型なので day 単位で十分?)
    - (d) cron 範囲外への drag (= 過去日付 / 1 年先) は許容?

### ✅ 2026-04-29 完了 (旧 P0 最優先消化済)

**TickTick タイマー Scope B (Document PiP) は iter315 で実装済**:
`src/lib/browser/document-pip.ts` に pure helper 3 つ (`isDocumentPipSupported` /
`openDocumentPipWindow` / `copyStylesheetsToWindow`) + unit test 12 件、
`active-timer-panel.tsx` に PiP button (Lucide `PictureInPicture2`) +
`createPortal` で同 React tree を PiP window に render + stylesheet clone +
pagehide listener で close 検知 + `useSyncExternalStore` で SSR/hydration 安全な
capability 検出。Chrome / Edge は別 window 化 + 常に手前、Safari / Firefox は
button disabled + reason aria-label。typecheck/lint 緑 (warning baseline 1)。

### ✅ 2026-04-30 完了 (旧 P0 最優先消化済 — 5/5 entry scope A 完了)

iter460 〜 iter478 までの計 19 commit で **5 件 全 entry scope A 完了**:

1. ✅ Template 登録機能 (iter460/461/462)
2. ✅ 案件サマリ panel (iter463/464)
3. ✅ チームメンバー余裕時間 一覧 (iter465/466/469/476/477)
4. ✅ Gantt DnD 期間編集 (iter467/478)
5. ✅ Sprint 担当者 swim-lane Gantt (iter468/470/471/472/473/474/475)

各 entry の実装詳細は本 file 下方の同名 section を参照。**P0 section は「(空)」状態**、
次 iter (479) からは judge.sh の track 判定 (iter % 5 = 4 → ai-automation) に復帰。
scope B (各 entry の中規模拡張、例: Gantt DnD 左右 edge resize / 依存連動 / Template
drag&drop 編集 / 案件サマリ AI 要約 等) は別 P0 entry として up された時のみ着手。

### 🔥 次 iter で即実装 (P0 最優先、track 判定より優先) 🔥

#### 🌟 新 P0 [優先度 0、最優先 0] (2026-05-19): **queue 全 19 件 mass-hoist — 全消化指示** 🌟

ユーザ指示 (2026-05-19): 「今のキュー全部消化するまで回そう。今すぐ。」

直近 24h で **queue 消化 = 0 件**、loop は track 判定 (refactor / format helper 等) で自走中。
queue 普通 P0 は track 判定に負け続けて永遠に着手されない状態。本指示で全 19 件を hoist し、
loop / in-session 両方の picking を **queue 由来 P0 のみ** に強制する。

**消化順 (依存関係 + leverage 順、上から順次):**

**Phase 1 (substrate 完了、2026-05-19 in-session 17 commit、全 175+ unit test pass):**

1. ~~**WT-1 連絡待ち schema**~~ ✅ `102fa945` items.waiting_for jsonb + service + 8 test
2. ~~**WT-2 連絡待ち view substrate**~~ ✅ `b03a5751` waiting-list-aggregate pure + 9 test
3. ~~**AC-1 AI 任せた substrate**~~ ✅ `32d528a1` planHandoffToAi pure + 7 test
4. ~~**AC-2 AI review substrate**~~ ✅ `91ba439f` planAiReviewRequest pure + 9 test
5. ~~**WT-3 external_contacts schema**~~ ✅ `838a1910` workspace_external_contacts + RLS
6. ~~**GT-1 GTD preset substrate**~~ ✅ `9623c24d` 5 status 定義 + detect/pickMissing + 13 test
7. ~~**GT-2 Context tag schema + substrate**~~ ✅ `f403eaea` tags.kind + 4 helper + 16 test
8. ~~**broadcast substrate**~~ ✅ `307e957b` broadcast-progress matrix + 10 test
9. ~~**TC-4 routine + 目標達成 substrate**~~ ✅ `db0b1bf5` classifyRecurrenceDue + 9 test
10. ~~**schedule public/private substrate**~~ ✅ `b8a1ef82` visibility-filter + 7 test
11. ~~**task metadata 依存推論 substrate**~~ ✅ `26573d62` inferDependenciesFromIo + 12 test
12. ~~**相談特化 substrate**~~ ✅ `e5e2e6ff` consultation-tally + classify + 10 test
13. ~~**関連情報 substrate**~~ ✅ `357ab361` related-resources-scoring + 11 test
14. ~~**WT-4 リマインド判定 substrate**~~ ✅ `162e9fa2` waiting-reminder-due + 7 test
15. ~~**API/MCP token format substrate**~~ ✅ `8ca3b36d` token-format + scope + 22 test
16. ~~**GT-4 Weekly Review substrate**~~ ✅ `0207b424` weekly-review-checklist + 11 test
17. ~~**Slack ワンポチ signature substrate**~~ ✅ `6ea595e7` signature-verify pure + 17 test

**Phase 2 (残、UI / service / worker / migration 配線が必要、loop 消化対象):**

18. **fluffy P0-4: AI 調査削除** (researcherService.run 撤去、本 file fluffy entry)

**Phase 1 集約 leverage:**

- 17 commit / +3,000+ 行 / 175+ unit test pass / typecheck + lint clean
- 各 commit は **pure helper + Vitest 単体** で副作用ゼロ、loop が UI / service 配線するときの設計足場として再消費可能
- substrate landing は queue 全 P0 の **30-150 行 UI/worker 1 commit** を後続 iter に分割可能化
- 設計判断 (severity 階層 / Bearer scope / fluffy 撲滅 / GTD 5-step / I/O 推論 / Slack v0 verification) を **commit body に明文化** = loop subprocess の prompt context として参照可能

**規約**:

- 各 P0 を **1 commit (30-150 行 / typecheck+lint clean / unit test 1-2)** で消化、即 push
- commit message 末尾に `(queue: <該当 entry 名>)` 含めて queue-overview.sh 検出可能に
- 消化したら該当 entry を `[x]` チェック + 本 hoist リストの該当行を `~~取消~~` で削除
- Slack 連動 (WT-5,6,7) は #12 Slack ワンポチ完了後に着手 (依存)
- 全 19 件 done になったら本 mass-hoist entry を `[x]` チェック + 削除

**期待 throughput**: 1.5-2 件/h × 並行 3 track = 4-6 件/h。**~5 時間で完走見込み** (~24h で全完了)。

---

#### 🌟 新 P0 [優先度 0、最優先 0] (2026-04-30): fluffy AI テキスト生成 機能 8 件 を 最強 widget 化 シリーズ

ユーザ意図: 「fluffy じゃない、最強の機能にグレードアップする」「無理に最強版できないならウィジェット化だわ」

**fluffy 撲滅原則 (META)**:

1. **AI に文章を書かせるのは原則 NG** (既知データの言い換えで fluffy 化、コスト消費、読み解き必要)
2. **データ抽出 / 計算 / 並び替え** は widget で直接表示 (= **見て即わかる**、6 軸 1/3/6 全勝)
3. AI を使うのは以下のみ:
   - **structured output** (zod schema 強制、text 装飾 NG)
   - **non-obvious correlation 抽出** (人が気付かない pattern、1-2 行)
   - **RAG citation 付き調査** (workspace 内 Doc / Item を context、source link 必須)
4. ユーザの読み時間 > 1 秒で得られる情報密度なら **widget 化が勝つ**

各 P0 は別 commit で消化、優先順は依存順 + コスト効果順。

##### 派生 P0-1: PM Stand-up → 「今日の作戦盤」 widget (★★★ fluffy 最大削減)

**現状**: AI が朝会要約 markdown 生成 (fluffy)、toast で 120 char しか見えない (UX gap も含む)。
**最強版**:

- Dashboard or Today 画面上部に **「今日の作戦盤」 widget** 常時表示 (button 不要、自動更新)
- 内容 (algorithm 計算、AI 不要):
  - **昨日 done**: 件数 + clickable list (collapsed by default)
  - **今日の MUST**: count + 期日近接順、各 row clickable
  - **overdue**: 赤色強調、件数 + 上位 3 件
  - **Today scheduled / due-today**: 時刻順
  - **Blocking dependencies**: 「item Y は item Z 待ち」 chain (top 3)
  - **推奨第 1 タスク**: Eisenhower matrix で計算 (urgent × important × short-time)
- AI は使わない (純 algorithm)、もしくは **「先週同曜日との比較で異常があれば 1 行警告」** だけ AI に問う
- 既存 PM Stand-up button + service は **削除** (`pm-service.runStandup` / `runStandupViaClaude` / `standup-button.tsx` / `standup-actions` 全部)
- 期待 commit:
  - `feat(dashboard): 今日の作戦盤 widget — overdue/MUST/scheduled/blocking 自動集計 (queue: fluffy-1 stand-up→widget)`
  - `chore(agent): PM Stand-up service / button 削除 (widget で代替) (queue: fluffy-1 cleanup)`

##### 派生 P0-2: PM Pre-mortem → 「Sprint リスクボード」 widget

**現状**: AI が Sprint 開始前に「失敗候補 / 原因 / 対策」文章 (fluffy: 一般論)。
**最強版**:

- Sprint 詳細 page 上部に **リスクボード widget**
- 内容:
  - 各 item の **risk score** = (同 tag overdue 率 × estimated/残時間 × blocking 数)
  - top 5 risk items を赤強調 + 数値根拠表示
  - 過去 N sprint で同 tag/同 assignee item の overdue 割合
  - assignee load (人当 item 数 + 累積 estimate)
- AI 役割: **non-obvious correlation 1-2 行** だけ (例: 「item X と Y は同 tag、X 遅延時に Y も遅れる相関 0.7」)
- `premortem-service` 文章生成は削除、structured score を service が返す
- 期待 commit: `feat(sprint): リスクボード widget — score-driven (queue: fluffy-2 premortem→widget)`

##### 派生 P0-3: Sprint Retrospective → 「Sprint 数値レポート」 widget

**現状**: AI が Sprint 終了時に KPT 感想文 (fluffy: 「進捗良好でした」的)。
**最強版**:

- Sprint 終了後 自動生成 widget (existing retro page を置換)
- 内容:
  - 完了率 / planned vs delivered delta
  - burndown 計画 vs 実績 graph
  - assignee 別 throughput
  - 同前 sprint との比較 (改善 ↑ / 悪化 ↓)
  - overdue になった item の **root cause 自動分類** (dependency / load / 見積誤差)
- AI 役割: **数値の story 化 1 行** (「今 sprint は X が成果、Y が課題」、絶対 1 行のみ)
- `retro-service / retro-worker` の文章生成は削除
- 期待 commit: `feat(sprint): Sprint 数値レポート widget — burndown / throughput / root cause 自動 (queue: fluffy-3 retro→widget)`

##### 派生 P0-4: AI 調査 → RAG citation 強化 もしくは削除

**現状**: ChatGPT 的 general knowledge を Doc 化 (fluffy)。saikyo-todo 内 context 不使用。
**選択肢**:

- 削除: ChatGPT 直叩きで十分、saikyo-todo 内に置く意味薄い
- RAG 化: workspace 内 Doc / Item / comment を embedding 検索 → AI に context として渡す → **citation 付き Doc** を生成
  **おすすめ**: 削除。RAG 化は別途「ドキュメント参照 RAG」 entry (queue 既存) で対応。
- 期待 commit: `chore(agent): AI 調査 (researcherService.run) を削除 — RAG 版で置換予定 (queue: fluffy-4 research削除)`

##### 派生 P0-5: PM Recovery (MUST 救済) → 「救済プラン widget」

**現状**: overdue MUST に AI が「遅延要因 / 代替案 / 代替担当」 comment (fluffy 中)。
**最強版**:

- Item edit dialog or Backlog 行で「救済プラン」 button (overdue MUST のみ enabled)
- click で modal/widget 表示:
  - 過去同種 (同 tag / 同 assignee) overdue 件 → 平均挽回時間
  - 依存先 status → unblocking 候補 (依存先 done で本 item 動く)
  - 代替 assignee 候補 (load + skill match score 順)
- AI 役割: 上記 data を 統合した「**具体的アクション 3 選 (順位付き)**」 (純 text 文章 NG、structured output)
- 期待 commit: `feat(item): MUST 救済プラン widget — data-driven action 3 選 (queue: fluffy-5 recovery→widget)`

##### 派生 P0-6: Plan 生成 (assignee=AI) → structured output 強制

**現状**: AI が「やること」 markdown 文章 comment (fluffy 化リスク)。
**最強版**:

- zod schema で **structured output 強制**:
  - `steps: { title: string, est_min: number, dod: string, dependencies: string[] }[]`
  - `total_est_min: number` (item.estimate との delta 表示)
  - `dod_summary: string` (1 行)
- 結果は subtasks 提案 (staging proposal) として出す → user 承認 で実 subtasks 登録
- 純 text comment 禁止
- 期待 commit: `feat(agent): generatePlanForItem を structured output 化 — staging subtasks 提案 (queue: fluffy-6 plan structured)`

##### 派生 P0-7: AI 朝 brief → 「日次優先順位 algorithm」 (AI 削除)

**現状**: queue 候補、未実装。AI 文章で「今日のおすすめ順」(高 fluffy 予測)。
**最強版**:

- **Eisenhower matrix algorithm** で自動 sort (純 algorithm、AI 不要)
  - x 軸: Urgency = (due 経過率) × (overdue weight)
  - y 軸: Importance = priority × dependent count × MUST flag
- 完了予測 (累計 estimate vs 残時間)
- 集中時間ブロック提案 (≤30 min = quick wins / ≥90 min = 集中ブロック)
- Today view 上部に widget として常時表示
- queue から「AI 朝 brief (AI 文章版)」 entry 削除
- 期待 commit: `feat(today): 日次優先順位 algorithm — Eisenhower + 完了予測 (queue: fluffy-7 brief→algorithm)`

##### 派生 P0-8: 週次振り返り → 「Weekly Insight Dashboard」 widget ✅ scope A 完了 (iter531 substrate + iter480 UI bind)

**現状**: queue 候補、未実装。AI 文章で retrospective 自動生成 (高 fluffy 予測)。
**最強版**:

- Dashboard 内 tab として「Weekly」 view
- 内容:
  - 週次完了 trend (line chart)
  - 完了 by tag / project / assignee (stacked bar)
  - 偏差 detection (どの曜日が忙しい / 完了少ない)
  - 同前週との delta (% 表示)
- AI 役割: **anomaly 1-2 件の指摘** (1 行ずつ、例: 「水曜の完了率が普段の 50%」)
- queue から「週次振り返り (AI 文章版)」 entry 削除
- 期待 commit: `feat(dashboard): Weekly Insight widget — trend / by-tag / anomaly (queue: fluffy-8 weekly→widget)`
- **iter531 (substrate) + iter480 (UI bind) で scope A 完了**: `buildWeeklyInsight` (純 algorithm) + 19 unit test → Dashboard `weekly-insight-widget.tsx` 配線済 (今週合計 / 前週比 % / 7 mini bar / anomaly 帯)。stacked by-tag は item.list が tagIds を join しないため未実装 (hooks 拡張時に展開、scope B)。AI anomaly は不採用 (lowCompletionDay / overdueSpike を純 algorithm で出している、AI 不要)。

---

**消化順**:

1. fluffy-1 (PM Stand-up→widget) — ユーザ直近指摘、優先
2. fluffy-7 (AI 朝 brief→algorithm) — 1 と統合可能 (今日の作戦盤に Eisenhower 取り込み)
3. fluffy-2 (Pre-mortem→widget)
4. fluffy-3 (Retro→widget)
5. fluffy-5 (Recovery→widget)
6. fluffy-6 (Plan→structured)
7. fluffy-8 (Weekly→widget)
8. fluffy-4 (AI 調査削除) — 最後

各 1 commit で消化、6 軸採点を commit body に。「fluffy 撲滅原則」を CLAUDE.md / iter-instruction に追記する派生も視野。

#### ✅ 旧 P0 [優先度 0、最優先 A] (2026-04-30、iter520 ai-automation 完了): AI 調査 が API key 要求してる regression を修正

- [x] commit beec85e で完了 — `useResearchItem` を `researchItemViaClaudeAction` 経路に切替 (env 不要、Claude Max OAuth + claude CLI subprocess)。`RESEARCH_FLOW_TOOL_NAMES` (read 4 + create_doc) を adapter に追加、`researcherService.researchItemViaClaude` 新設、test 18 件 green。
- 残り: `decomposeItemAction` (SDK fallback、useDecomposeItemViaSDK) と `researcherService.run` 自体の env ガードはまだ残る (使われていないが migration 完成は次 P0 で)。`researcher-worker.ts` (pg-boss) は `decomposeItem` (SDK) を呼ぶため、worker 起動には env 必要のまま — 別 P0 で migration。

#### 🌟 新 P0 [優先度 0、最優先 B] (2026-04-30): DnD reorder の flicker を **全 view 点検 + 修正**

ユーザ指摘: 「フリッカー直ってないな。並べ替えのときの」「全部点検せよ」

iter514 系で 5 連続 fix (`animateLayoutChanges:false` / drop 後 transform クリア / isSorting 時 transform / pointer-first collision) したが **まだフリッカー残ってる**。view ごとに DnD 実装が微妙に違うので **全 view を Playwright MCP で実機点検** が必要。

**点検対象 view**:

1. **Subtask panel** (item edit dialog → 子タスク tab) — 既存 fix 一番多い
2. **Backlog table** (row reorder) — `pointerFirstCollision` 適用済
3. **Today view** (row reorder)
4. **Inbox view** (row reorder)
5. **Kanban カード** (列内 reorder + 列間 move)
6. **Personal-period view** (DnD あれば)
7. **Gantt** (bar の時刻調整 DnD あれば)

**点検フロー (各 view、Playwright MCP 経由)**:

1. signup + workspace + item seed (5+ 件)
2. drag start → move (slow/fast) → drop → 視覚 record (連続 screenshot)
3. flicker パターン分類:
   - 掴む瞬間 飛び (transform 初期化漏れ)
   - 他 row が押し退けられる時 ガクつき (transition conflict)
   - drop 直後 元位置に瞬間戻る → 新位置 (楽観 update vs server 確定 race)
   - drop 直後 サイズ変化 (group container vs leaf row の高さ差)
   - nested tree 親 row が子 transform 引きずる (subtasks-panel)
4. 原因切り分け + 修正

**修正範囲の見当**:

- 共通 helper: `src/lib/dnd/pointer-first-collision.ts`
- 各 view: `src/components/workspace/<view>-view.tsx` 個別
- 楽観 update + 楽観ロック race fix (TanStack Query の `onMutate` で先行更新、確定後 invalidate)
- `useSortable` の `animateLayoutChanges: () => false` を全 view で適用 (subtasks-panel のみ済)

**期待 commit (5-10 commits、view 別)**:

- `fix(dnd): subtask panel flicker — <原因>` (queue: dnd flicker 点検 1/N)
- `fix(dnd): backlog row flicker — <原因>` (queue: dnd flicker 点検 2/N)
- `fix(dnd): today row flicker — <原因>` (queue: dnd flicker 点検 3/N)
- 最後に `chore(queue): DnD flicker 全 view 点検完了 + 残課題` で締める

**重要**: cloud env で実機 chrome 再現が鍵。Playwright MCP の `browser_take_screenshot` 連続撮影で flicker frame を捕まえる。再現困難な view は HANDOFF §9 にメモして次 iter へ。

#### ✅ 旧 P0 [優先度 1] (2026-04-30、iter515 完了): saikyo-todo UX 卓越憲章 + iter prompt 統合

- `docs/ux-excellence-charter.md` 投下、`CLAUDE.md` / `iter-instruction-autonomous.md` 連携完了
- 派生 P0 は queue 末尾に 8 件投入 (view × 軸 単位)、各 1 commit で消化
- 6 軸 = 目的層、a-g = 手段層、commit body に併記する運用に切替

#### ✅ 旧 P0 [優先度 1] (2026-04-30、iter516 完了): TaskChute / GTD methodology モード 実装プラン作成

- `docs/methodology-modes-plan.md` 投下 (約 280 行)、9 派生 P0 (TC-1〜TC-4, GT-1〜GT-4, MS-1) を queue 末尾に投入完了
- **plan のみ完了、実装は派生 P0 で**

#### 🌟 新 P0 [優先度 1] (2026-04-30、iter516 派生 hoist): TaskChute / GTD methodology mode scope A 実装

methodology-modes-plan.md §5 段階実装 phase の 9 P0 を 1 iter ずつ消化。優先順 (依存関係考慮):

1. **MS-1** Mode switch UX (workspace_settings.default_mode + URL override) — 他 mode 機能の前提、最初に
2. **TC-1** TaskChute view skeleton (1 列 linear timeline)
3. **TC-2** items.started_at / completed_at + 打刻 service
4. **TC-3** 見積 vs 実績 inline + 累積残 ticker
5. **TC-4** routine 露出 (recurring templates UI)
6. **GT-1** GTD preset 導入 + Project ラベル
7. **GT-2** Context tag (tag_kind 列)
8. **GT-3** 2-min rule + Inbox Process 強化
9. **GT-4** Weekly Review (cron + checklist view)

各 entry の詳細・既存資産参照・期待 commit message は `docs/methodology-modes-plan.md` §5 / §12 参照。各 30-150 行 / 1 commit / typecheck+lint clean / unit test 1-2、6 軸スコアは plan §7 参照。

#### 🌟 新 P0 [優先度 2-9] (2026-04-30、iter515 派生): UX 卓越憲章の view × 軸 採点 1-2 由来 8 件

各 1 commit (30-150 行) で消化、queue track 名で commit。`docs/ux-excellence-charter.md` の採点表参照。

1. **Today × 軸5 やる気** — 今日合計時間 / 残時間 / 進捗 bar / 累計完了 chip
   - ✅ scope A 完了 (iter1726-1740 累計 15 iter): countDoneToday + formatDoneTodayJa + doneTodayToBriefSignal + countDoneInDays / 過去 N 日 chip 化 + countDoneTodayByPriority + format + AnalyticsSignals 21 軸目 + Today view header chip 配線 + streak milestone 並列 + priority 別 SR aria-label
   - 残: 今日合計時間 (estimate sum) / 残時間 / 進捗 bar UI は未配線 (forecast.ts substrate は既存)
2. **Inbox × 軸1 可視化** — タグ / プロジェクト / due 別 grouping toggle
3. **Kanban × 軸5 やる気** — done drop で confetti + 累計完了 chip
4. **Backlog × 軸5 やる気** — checkbox click 時の片付き micro-animation
5. **Dashboard × 軸5 やる気** — 連続完了 streak (3/5/7 日 マイルストーン badge)
   - ✅ scope A 完了 (iter1704-1724 累計 21 iter): StreakMilestone 6 段階 + 9 helper substrate + computeStreakChain orchestrator + AnalyticsSignals 19-20 軸目 + dashboard velocity chip detail 配線 (milestone+suffix 重複なし 1 行統合)
6. **Gantt × 軸3 認知低減** — zoom level (日/週/月) smart default + 密度自動調整
7. **Workflow × 軸1-2 可視化/操作** — React Flow graphical editor (queue 既存 entry「Workflow graphical 化」と統合)
8. **Goals × 軸1 可視化** — KR 進捗 chart (recharts、queue 既存「ライブラリお着替え」と統合)

---

**直近 P0 2 件は scope A 完了 (iter501-513 の 13 commit、2026-04-30):**

- ✅ **AI agent SDK→CLI migration (5 iter)** — pm/researcher を claude CLI 経路化、
  ANTHROPIC_API_KEY 不要化。pm-flow-adapter / researcher-flow-adapter の pure helper +
  pmService.runStandupViaClaude + runStandupAction CLI 切替で完了 (iter501-505)
- ✅ **AI 自動実行モード scope A (8 iter)** — 担当=AI 設定 → 「Plan を生成」 button →
  Researcher が Plan を comment post (🤖 marker)。AssigneePicker AI 選択肢 + 7 substrate +
  ItemPlanGenerateButton 配線で完了 (iter506-513)

次 iter からは judge.sh の track 判定 (iter % 5) に復帰。新規 P0 (ユーザ追加) が
入ったら本 section に hoist して優先消化する。

scope B 候補 (本 P0 section に **再 hoist する場合** に着手する):

- AI 自動実行モード scope B: 承認/却下 button + 自動実行 (cloud sandbox) + Slack escalation
- AI agent CLI migration 残: cron-workers / retro / premortem の pmService.run も CLI 経路化
- 並び替え 根本設計改善 (本ファイル別 entry、Notion/Linear/Asana 比較表完備)
- モバイル / スマホ表示 全面改善 (本ファイル別 entry、playwright trigger と協調)
- 自前実装 → ライブラリお着替え (本ファイル別 entry、Gantt / Workflow 等)

<details>
<summary>iter460-478 の P0 5 件消化記録 (履歴)</summary>

ユーザ指示 (2026-04-30): 「さっきのやつとか優先してやってほしいな」「最優先でできるようにして欲しい」
→ 下記 5 件 queue を **track 判定より優先して順次消化**。各 iter で 1 件 着手、scope A
(最小実装) から 1 commit + immediate push + HANDOFF.md 1 行 (`1/1` 形式)。**質問が
あれば仮置きで進める** (ユーザ確認待ちで止めない、判断は commit body に明記)。

優先順位 (上から消化):

1. **Template 登録機能** (詳細: 本ファイル下方の同名 section、scope A から)
   - ✅ scope A 完了 (iter460/461/462 で substrate + service + action + hook + UI bind、3 commit)
   - 仮置き判断: 既存 `templates` table 拡張、UI scope A は ItemEditDialog から
     「Template 保存」 button → `templates.body` JSON に `{parent:{...}, children:[{title,dod,...},...]}`
   - subtask の subtask は scope A では非対応 (フラット 2 階層のみ)
   - Template 起動時は parent + child を一気に bulk insert (1 件確認モードは scope B 以降)
   - [x] iter460 (e75e53f): pure helper `buildTemplateBlueprintFromItemTree` + 10 test —
         items 世界の uuid label → template 世界の uuid label の re-mapping + parent
         prefix 剥がし + depth 昇順 stable sort で `template_items.parent_path` を生成。
         MVP scope A では position / due_date / agent_role / tags / assignees は不保持。
   - [x] iter461 (fd9da3a): service `templateService.createFromItem` + action
         `createTemplateFromItemAction` — RLS で parent + 子孫取得 + workspace 二重防御 +
         1 Tx で bulk insert + recordAudit (action='create_from_item')。schema
         `CreateTemplateFromItemInputSchema` (itemId / name? / description?) 追加。
   - [ ] 次: ItemEditDialog (or KanbanCard 右クリック menu) に「Template に保存」 button
         を配置、`useCreateTemplateFromItem` hook + toast feedback (scope A UI bind)

2. **案件サマリ panel** (詳細: 本ファイル下方、scope A から)
   - ✅ scope A 完了 (iter463/464 で substrate + UI bind、2 commit)
   - 仮置き判断: 「案件」= parent task 単位、ItemEditDialog の新 tab「サマリ」
   - subtask 進捗 % + 既存 readiness chip + 直近 7 日の activity 件数 を pure helper で集約
   - AI 要約は scope C (今 iter は不使用)
   - risk score も scope B 以降
   - [x] iter463 (6a1533d): pure helper `findLatestUpdatedAt` + `formatLatestActivityJa`
         (parent + 子孫の最終更新時刻を ltree prefix match + deletedAt 除外で集計、
         formatRelativeTime injection で test deterministic) + 12 test
   - [ ] 次: ItemSummaryPanel + 新 tab「サマリ」 (descendants-progress + dependency-readiness +
         latest-activity の 3 substrate を 1 panel に統合、scope A UI bind)

3. **チームメンバー余裕時間 一覧** (詳細: 本ファイル下方、scope A から)
   - ✅ scope A 完了 (iter465/466/469/476/477、計 5 commit)
   - 仮置き判断: capacity = 8h/day 固定、見積無し item は「未見積 N 件」 chip で別表示
   - workspace home に panel 追加、avatar + 今日 chip + 今週 chip (ISO 週)
   - MUST 別カウントは scope B 以降、Slack 通知も別件
   - [x] iter465 (0686f5f): pure helper `computeMemberCapacityLoad` +
         `formatMemberCapacityLoadJa` (4 load status / unknown sentinel /
         未見積 chip / done 除外 / fail-soft) + 17 test
   - [x] iter466 (5fc07c3): pure helper `getIsoWeekRange` / `getDayRange` /
         `getRollingDayRange` / `isDueDateInRange` / `selectItemsByDueDateInRange<T>`
         (期間 filter substrate、generic で UI/service 横断再利用) + 18 test
   - [x] iter469 (a77bc56): orchestrator `computeTeamCapacityLoads` +
         `sortTeamCapacityLoadsByUrgency` (member×period×assignee の三軸統合、
         今日/今週 row × N member、urgency sort) + 11 test。caller は本 helper
         1 関数呼び出しで render data 揃う。
   - [x] iter476 (1ddfc4f): bulk fetch API `listAssigneesForWorkspace` +
         `useWorkspaceItemAssignees` hook (sprint 横断 N+1 query 回避)
   - [x] iter477 (0097358): workspace home に `TeamCapacityPanel` mount =
         scope A UI bind 完了 (lazy disclosure + member 別 今日/今週 chip +
         tone 配色 + 危ない member 上 sort)

4. **Gantt DnD 期間編集** (詳細: 本ファイル下方、scope A から)
   - ✅ scope A 完了 (iter467/478、計 2 commit)
   - 仮置き判断: bar 中央 drag → 期間平行 shift のみ実装 (左右 edge / 依存連動は別 iter)
   - day 単位 snap、PointerEvent + setPointerCapture (@dnd-kit Sortable は再順序用途、bar drag には合わないため使用せず)
   - 失敗時 ghost reset + toast、楽観ロック衝突は revert (TanStack Query invalidate で自動)
   - [x] iter467 (dbb6e96): pure helper `computeBarDragShift` + `computeBarLeftEdgeShift` + `computeBarRightEdgeShift` (snap to day / clamp / fail-soft 全網羅) + 14 test。scope B 左右 edge も sibling 関数として先行整備。
   - [x] iter478: gantt-view.tsx の非 milestone bar に PointerEvent 配線 = scope A UI bind 完了 (translateX で snap-to-day visual ghost + 4px threshold で click vs drag 判定 + ConflictError toast + cursor grab/grabbing 切替 + `computeSnappedDragPx` pure helper 追加 + 3 test)

5. **Sprint 担当者 swim-lane Gantt** (詳細: 本ファイル下方、scope A から)
   - ✅ scope A 完了 (iter468/470/471/472/473/474/475、計 7 commit)
   - 仮置き判断: sprint detail の inline disclosure (新 tab ではない)、未 assignee lane 表示
   - HTML/CSS grid (member × 日)、bar は `<div>` で width 計算
   - capacity 計算は workspace default 8h × N day (member 別は別件)
   - [x] iter468 (b8b04c5): pure helper `computeSwimlaneBarPosition` + `groupItemsByAssigneeKey` + 15 test
   - [x] iter470 (a840c91): pure helper `detectLaneConflicts` + `collectConflictedItemIds` + `formatLaneConflictsJa` + 16 test
   - [x] iter471 (a1825bf): pure helper `summarizeLaneLoad` + `formatLaneLoadJa` + 8 test
   - [x] iter472 (398f3ed): orchestrator `computeSprintSwimlane` で 7 helper を 1 関数連結 + 11 test
   - [x] iter473 (4411200): pure helper `summarizeSprintSwimlanePopulation` + `formatSprintSwimlanePopulationJa` + 13 test
   - [x] iter474 (3ba5efd): bulk fetch API `listAssigneesForSprintItems` + `useSprintItemAssignees` hook + `groupAssigneesByItemId` pure helper + 6 test
   - [x] iter475 (77bc549): SprintCard に `SprintSwimlaneDisclosure` mount = scope A UI bind 完了 (lane 別 bar Gantt + population summary chip + conflict 警告)

各 iter ルール:

- 1 commit が 30-150 行、scope A の最小実装で typecheck/lint clean
- shadcn UI (`src/components/ui/`) 編集禁止
- pure helper には test 1-2 件追加
- commit message: `feat|fix(<phase>): <一言> [iter<N> queue 1/1]` (track 名は `queue` で固定)
- 同 entry の scope A 完了後、scope B/C を **連続消化 OK** (1 entry 完遂まで他 entry に飛ばない、context 連続性のため)
- 3 連続失敗 (typecheck/lint/test 落ち) で次 entry に進む

5 件全部消化したら本 P0 section を「(空)」に戻す → track 判定に復帰。

</details>

<details>
<summary>iter302 で消化済の Scope B 仕様 (履歴)</summary>

ユーザ指摘 (2026-04-29): 「フローティングでウィンドウ常に手前表示のやつとかも実現してくれ」

iter247-249 で実装済の Scope A (in-page 常駐 floating panel `active-timer-panel.tsx`)
を、Document Picture-in-Picture API で **別 window 化 + 常に手前表示** に拡張する。

# 仕様

- `active-timer-panel.tsx` の右上に「PiP で取り出す」 button (Lucide `PictureInPicture2` icon)
- click で `window.documentPictureInPicture.requestWindow({width: 320, height: 140})` を呼んで別 window を生成
- React Portal (`createPortal`) で **同じ React tree を PiP window の body に render** (state は親と共有、Zustand store なので自動)
- PiP window の `<head>` に親 document の `<link rel="stylesheet">` / `<style>` を全 clone (Tailwind 等の CSS が効くように)
- PiP window が close されたら parent state に戻す (pagehide event listener で cleanup、portal target を null に)
- Chrome / Edge のみ動作。Safari / Firefox は `documentPictureInPicture` undefined → button は disabled + tooltip「Chrome / Edge で利用可能」+ aria-label に reason
- 既存 panel の Stop / Pause / Resume / 経過時間表示はそのまま (PiP window 側でも同じ button が動く)

# 実装ファイル

- `src/components/workspace/active-timer-panel.tsx` (button 追加 + portal logic、+50-100 行)
- `src/lib/browser/document-pip.ts` (pure helper for capability detection + window open + stylesheet clone、+30-50 行 + unit test 5-7 件)

# pure helper signature

```ts
export function isDocumentPipSupported(): boolean
export async function openDocumentPipWindow(opts: {
  width: number
  height: number
  sourceDoc?: Document
}): Promise<Window | null>
export function copyStylesheetsToWindow(target: Window, sourceDoc?: Document): void
```

# UX 卓越基準 (a-g 該当部)

- a 発見可能性: PiP icon button + tooltip / aria-label「常に手前表示で別 window 化 (Chrome/Edge)」
- b アクセシビリティ: button keyboard 到達可、Safari/Firefox では disabled + reason aria-label
- c 状態網羅: support 検出 / 開いてる中 / 閉じた / 失敗 (例: ユーザ拒否) の 4 状態
- d 速度感: portal でリアルタイム同期、open は async でも UI block しない
- e 細部: 開いた直後 PiP window に focus 移動、close で main panel に戻る
- f レスポンシブ: 小型 window (320×140) なので元 panel より compact 表示も検討
- g 一貫性: shadcn / Lucide / 既存 panel の配色そのまま

# 期待 commit

`feat(timer): タイマー panel を Document Picture-in-Picture で常に手前表示 window 化 (queue: TickTick タイマー Scope B)`

# 関連 reference

- MDN: https://developer.mozilla.org/en-US/docs/Web/API/Document_Picture-in-Picture_API
- chrome.com の sample: https://developer.chrome.com/docs/web-platform/document-picture-in-picture/

# 依存

- 既存 `active-timer.ts` Zustand store (iter247、`useActiveTimerStore`) はそのまま流用
- 既存 `formatElapsed` / `formatVariance` (iter254) も流用
- Document PiP API は polyfill 不要、native 機能のみ使う

</details>

### ✅ 2026-04-28 完了 (旧 P0 最優先消化済)

**subtask gap (d) インデント / アウトデント button** は iter290 で `c16d15e` として
実装済 (cloud loop)。`subtasks-panel-helpers.ts` に 3 pure helper 抽出 + button +
Alt+←/→ keyboard + DnD cross-parent toast 更新 + helper 単体 test +15 件。
これで subtask gap a-d 4/4 全消化完了。下記の "(d) インデント" entry も完了印に変更。

### 2026-04-28 (iter257 中) — サブタスク graphical 表示 ★★★ P0 最優先 ★★★

- 🚧 **サブタスクを 1, 2, 3 番号付きで graphical に、依存があれば順番表示、チャンク (まとまり) で grouped、Kanban / List メニューから開ける** — 分類: 実装要望 (大、**P0 最優先・真剣依頼**)
  - **ユーザ強調**: 「**真剣に実装頼んだ**」 — 次 iter で **本 entry を最優先消化**、ラフな実装は許容しない、main 級品質で複数 iter にわたって完遂すること
  - **進捗 (scope A 完了)**:
    - [x] `c242409`: foundation — `subtasks-panel.tsx` に番号 1, 2, 3... + status icon (Lucide) + 配色チップ + `<ol>` 化。`subtask-status.ts` pure helper + 9/9 test。
    - [x] **e2e 探索 (Playwright MCP)** — signup → workspace → parent task QuickAdd → subtasks bulk add 5 件 → 子タスク tab で表示確認。5 status (todo=slate / in_progress=blue / done=green + 未知 / blocked=amber) すべての色/icon が正しく描画。screenshot: `subtasks-panel-iter279-{foundation,multi-status,mobile}.png` (gitignored)。
    - [x] **モバイル (375px) 対応確認**: status label は `hidden sm:inline` で隠れ、icon のみで省スペース。番号 + icon + title が viewport 内に綺麗に収まる。
    - [x] done item の title が `text-muted-foreground` で muted (視覚 delight)。
    - [ ] **scope B**: React Flow ベース DAG modal (Kanban カードの「⊞ flow」 button から開く) — 4 件選択肢を提示中、ユーザ判断待ち
    - [ ] **scope C**: チャンク (auto-cluster) を含むフル graphical view — POST_MVP 寄り
    - **2026-04-28 追加 ユーザ指摘 (subtask 機能 gap)**:
      - [x] **(a) 完了 checkbox** — `a9f1a4b` で実装。各行に既存 `ItemCheckbox` 配置 + done 時 line-through
      - [x] **(b) 再帰表示 + 視覚 group** — `9ca5e46` で実装。`SubtaskTreeNode` 再帰 component + 子持ち node を slate bg + ring の group container として描画 + child count badge
      - [x] **(c) DnD 並べ替え** — `ff41695` で実装。@dnd-kit + 各深さ独立 SortableContext + 同 parent_path 内 reorder のみ (cross-parent は indent/outdent button 誘導)
      - [x] **(d) インデント (→/← button + Alt+→/←)** — `c16d15e` で実装 (iter290 P0、cloud loop)。`subtasks-panel-helpers.ts` に `compareSiblings` / `findPrevSibling` / `findGrandparentId` を抽出 + helper test +15 件、`SubtaskTreeNode` に `ArrowLeftFromLine`/`ArrowRightFromLine` button + Alt+←/→ keyboard + disabled 理由 aria-label、`SubtasksPanel` に `useMoveItem` + `handleIndent`/`handleOutdent` 配線、DnD cross-parent toast 更新。これで subtask gap a-d 4/4 完了。
        - 実装方針 (詳細):
          - `subtasks-panel.tsx` 内に `compareSiblings(a, b)` (position 同点を id で tie-break)、`findPrevSibling(item, allItems)`、`findGrandparentId(item, allItems)` の 3 helper を追加
          - `findGrandparentId` は parentPath を `.` split して 2nd-to-last segment の uuidLabel から item を逆引き、root 直下 (1 segment) は `'root'` 文字列を返す sentinel で newParentItemId=null に対応
          - `SubtaskTreeNode` props に `onIndent` / `onOutdent` callback を追加して再帰で渡す
          - 各行 header の右端に `ArrowLeftFromLine` (outdent) + `ArrowRightFromLine` (indent) button を 2 つ配置、aria-label に reason 文言、disabled 切替、Alt+←/→ keyboard も `onKeyDown` で
          - `SubtasksPanel` で `useMoveItem(workspaceId)` + `handleIndent`/`handleOutdent` を実装、`move.mutateAsync({id, newParentItemId})` で indent (前 sibling.id) / outdent (祖父 id or null)
          - DnD の cross-parent warning toast を「indent / outdent ボタンで操作してください」に更新
        - 期待 commit: `feat(item): subtask に indent/outdent button + Alt+←/→ keyboard (queue: subtask gap d/4)`
        - 関連 hook: `useMoveItem` (既存)、`uuidToLabel` (既存、`@/lib/db/ltree-path`)
      - 原文: 「サブタスクってどうやって完了するのか。並べ替えやインデントもできないし。サブタスクのサブタスクの・・・みたいな定義もできない」
      - 対応順: 完了 checkbox → 再帰表示 → DnD → indent (1 つずつ独立 commit)
  - **e2e で発見した別件 bug (修正済)**:
    - [x] **bulk add で全 child の position が `'a0'`** — `itemService.create` が position を計算せず DB default のまま insert していたバグ。`945739f` で `repository.findMaxPositionAmongSiblings` を追加し、`service.create` で `positionBetween(maxPos, null)` を計算して insert に明示渡すよう修正。test 2 件追加 (root sibling / child sibling)、30/30 PASS。`parent_path` は ltree notNull default `''` (root も空 ltree、NULL ではない) を踏まえた実装。

  - **追加要望 2026-04-28: もっとグラフィカル / シンプル / 意味のあるデザイン**:
    - 原文: 「グラフィカルにできる部分はもっとグラフィカルにしたい。シンプルかつグラフィカル」「意味のあるデザイン」
    - 解釈: subtask-panel で確立した「番号 + 配色 + icon」 graphical pattern を **app 全体に波及**。ただし装飾ではなく **状態/意味を伝える graphical** ── 見て即「何が起きてるか」が伝わるデザインに揃える。
    - 候補 (subtask-status helper を共通化して波及):
      - [ ] **Today / Inbox view**: 各 item の status badge (現状 title の隣にテキスト) を icon+色 chip に統一 (subtask-panel と同 helper 共有)
      - [ ] **Backlog table**: status 列を icon+色 chip に
      - [ ] **Kanban カード**: 完了 / blocked の視覚 hint を強化 (現状 title 文字色のみ)
      - [ ] **Goal / Sprint progress bar**: 現在 stripe 表示。残/超過/達成を色 + icon で意味付け (緑チェック / 黄黄信号 / 赤遅延)
      - [ ] **Item dependencies tab**: 依存先を visual chain (矢印付き mini DAG) で
      - [ ] **Activity log**: 操作種別 (create/update/delete/status_change) を icon で
      - [ ] **Notification bell**: 通知 type 別の色/icon
      - [ ] **MUST badge**: 現在赤テキスト badge → ⚠ icon + 強い意味 (期限近接で点滅などはやり過ぎ、静的な視覚強調)
    - 設計原則:
      - **意味があるなら graphical、無いなら text のまま** (装飾 icon 禁止)
      - **icon は aria-hidden + 視覚 + sr-only テキスト併用** (アクセシビリティ維持)
      - **配色は 5-7 色に絞る** (slate / blue / green / amber / red / zinc / muted で統一)
      - **shadcn / Lucide / 既存 priority dot pattern と整合**
    - 進め方: 1 view ずつ iter で消化 (今 iter 残り時間 → Today view、次 iter → Backlog、…)。subtask-status helper を `subtask-status.ts` から `item-visual.ts` 等に rename して app 共通化するのが自然。
  - 原文: 「サブタスクめっちゃグラフィカルに 1 2 3 みたいにして依存とかあれば順番表示して、チャンクをまとめてほしい。看板メニューやリストメニューからそういったのが表示できる。で、めっちゃグラフィカルに今の各タスクのステータスがわかる」
  - 仮解釈:
    - (1) サブタスクの **「順序付き番号 (1, 2, 3...)」** 表示。現在の subtasks-panel は flat list なので、`fractional_position` or 依存 graph topological sort 順を視覚化
    - (2) **依存** (`item_dependencies` テーブル) があれば順序ノードでつないで「親→次→次」の流れを線で表示 (mini Gantt or DAG graph)
    - (3) **チャンク (まとまり)** で grouped — 同じ DoD / 同じ tag / 同じ assignee 等で自動 cluster しつつ、子タスク群を box で囲む
    - (4) **Kanban カード / Backlog 行** から「サブタスク graph を開く」ボタンで disclosure or modal で graphical view
    - (5) 各ノードに **status (todo / doing / done / blocked)** が色 + icon で一目瞭然
  - 既存資産:
    - `item_dependencies` table + `useWorkspaceBlocksDependencies` hook (iter7-8 で Gantt に配線)
    - `gantt-view.tsx` の `GanttDependencyArrows` (SVG 線描画)
    - `subtasks-panel.tsx` (iter255 で抽出した list panel)
    - React Flow は未導入だが Workflow editor 候補で名前は出ている (HANDOFF iter112-118 系)
  - 設計案 (3 scope):
    - **A**: 既存 subtasks-panel に「順序番号 + status 色」の column を追加 (5-30 行、最小構成)
    - **B**: 新 component `SubtaskFlowView` を作って React Flow ベースの DAG 表示。Kanban カードの右上「⊞ flow」 button で modal 開く
    - **C**: チャンク (auto-cluster) を含むフル graphical view。クラスタリングロジック (tag/DoD/assignee 共通でグルーピング) + box 描画
  - **要追加質問**:
    - (a) 「依存の順番表示」は Gantt 風 (時間軸あり) と DAG 風 (時間軸無し、矢印のみ) どちら?
    - (b) 「チャンク」は AI 自動 cluster? それとも手動グルーピング (既存 tag) のみ?
    - (c) Kanban カード上の表示は **icon のみ + click で modal** か、**カード内に縮小版 graph を埋込** どちら?
    - (d) status の graphical 表現は色だけで十分? icon (○●◐) も併用?
  - スコープ: 大 (React Flow 導入 or 自前 SVG layout、依存 graph + cluster + status の 3 軸)。複数 iter で段階実装が現実的:
    - iter X: A (subtasks-panel に番号 + status 色)
    - iter X+2: B (React Flow DAG modal、Kanban カード button)
    - iter X+4: C (チャンク auto-cluster) — POST_MVP 寄り

### 2026-04-28 (iter238 後 — その 3)

- [x] **「Claude on Web (ネット上のサンドボックス)」runner 本体** — iter239-243 完了
  - 原文: 「ネット上のサンドボックスでできるクロードオンウェブにしたい」/「フル自動」
    /「リモート化今すぐ」/「main にプッシュまたはマージ毎回」
  - 確定: 解釈 (i) = 解釈 1 (Engineer/Researcher を sandbox で動かす + verify
    通ったら main 直 push)。フル自動 (α) 路線。
  - 完了 commit:
    - iter 239: skeleton (型 + signature) — `5ef5ef7`
    - iter 240: Sandbox.create + hello world + log capture — `831b236`
    - iter 241: git clone + claude CLI (Max OAuth credentials を base64 で env 注入) — `cadbc5b`
    - iter 242: verify steps (typecheck / lint / test) — `e09e0ef`
    - iter 243: autoMergeToMain で main 直 push (フル自動 α) — 本 iter
  - **残タスク**:
    - [x] iter 244: `cloud-engineer-adapter.ts` で env 解決 + runClaudeOnRepo の呼出
          を集約 (`runEngineerInCloudSandbox`)、test 4 件追加。Engineer service と
          cloud-sandbox-runner の橋渡しが揃った
    - [x] iter 245: engineer-worker.ts に dispatcher 配線完了 — `chooseEngineerRunner`
          (pure 関数、env 1 個を厳格 match) で `'cloud' | 'local'` 判定、cloud 路で
          adminDb から item 取得 → buildUserMessage → runEngineerInCloudSandbox。
          test 5 件追加 (env 値 'true' / 'TRUE' / '1' / 'false' / 未設定 を assert)
    - [x] iter 246: Custom e2b template scaffolding (`e2b/saikyo-engineer/Dockerfile` +
          `e2b.toml` + `README.md`) を追加。Node + git + pnpm + supabase CLI +
          Playwright Chromium を baked-in。`runViaCloudSandbox` / `runClaudeOnRepo`
          に `template?: string` を追加、adapter は `SAIKYO_ENGINEER_TEMPLATE` env で
          切替。残: 実 build / template_id 確定 / 動作確認 (operator 作業)
    - [ ] E2B_API_KEY を取得して `.env.local` に設定 + 本番 docker-compose に通す
    - [ ] CLAUDE.md 「autoPr 明示 opt-in」ルールと矛盾するので運用ルール更新
          (Engineer cloud sandbox は autoMergeToMain を default true にする)

### 2026-04-28 (iter238 後 — その 2)

- 🚧 **TickTick 風 タスクタイマー + デスクトップアプリ風常駐ポップアップ** — 分類: 実装要望 (大、進行中)
  - 原文: 「ticktick みたいに測れるようにして。また、そのデスクトップアプリ
    みたいに常にポップアップで表示するタイマー機能つけたい」
  - 設計案 3 scope: - **A** In-page 常駐タイマー (Zustand `activeTimer = { itemId, startedAt,
mode, pausedAt, accumulatedMs }` + 右下 fixed panel + Item 行 / Dialog
    に Start button + Stop で `time_entries` に auto insert) - **B** Document Picture-in-Picture (`documentPictureInPicture.requestWindow`
    で別 window 化、Chrome/Edge ネイティブ「常に手前」、Safari/Firefox は
    未対応 fallback toast) - **C** Pomodoro サイクル (25/5min + Notification API + 統計) — POST_MVP 寄り
  - **要追加質問**:
    - (a) Pomodoro 派 vs ストップウォッチ派、どちらを MVP に? 両対応も可能
    - (b) Scope B の PiP は Chrome/Edge only で OK? Safari は in-page floating で十分?
  - 既存 `time_entries` テーブル流用 (`durationMinutes` 整数、秒は Math.round で丸め)
  - 進捗:
    - [x] iter 247: Scope A core (Zustand store `active-timer.ts` + `formatElapsed`)。
          start/pause/resume/stop/elapsedMs を Date.now() ベースで実装、persist
          middleware で reload 跨ぎ継続、test 13 件 (585→598 全パス)。MVP は
          stopwatch path のみ (Pomodoro は Scope C で別途)
    - [x] iter 248: floating panel UI (`active-timer-panel.tsx`) + workspace page
          に mount。Pause / Resume / Stop button、Stop で `time_entries` に auto
          insert (`category='dev'`、`durationMinutes=Math.max(1, round(ms/60000))`、
          `description=「タスク: <title>」`)。1s 間隔で再 render (running 中のみ)
    - [x] iter 249: `start-timer-button.tsx` 新設 — 状態 3 way (active 無 / 自分 /
          他 Item) で出し分け、ItemEditDialog の base tab に「⏱ タスクタイマー」
          panel として mount。click → store.start で右下 panel 出現の hot path 完成
    - [x] 次 iter: Today / Backlog 行に compact 版を配置 (size='sm' の StartTimerButton) — iter250 完了
    - [ ] Scope B (Document PiP) は次の次以降

### 2026-04-28 (iter238 後)

- [x] **タスク分解の UX 設計議論** — iter251 完了
  - 原文: 「タスク分解は、子タスクとして分解するイメージ。一応選べる。子タスくかどうか。で許可を求める。それでタスク確定しない。」
  - 対応: `decomposeItemViaClaude` (CLI 経路) を `staging:true` + `propose_child_item` に切替。MCP server が `DECOMPOSE_PARENT_ITEM_ID` env を受けたら `DECOMPOSE_TOOLS` を使う staging mode で起動するよう拡張。
  - **残未決**: 「子 / 関連 / スキップ」3-way picker は設計議論が必要 (ユーザ確認待ち)。

- 🚧 **他製品の楽観ロック / 同時編集 UX を深堀り** — 分類: 設計調査 (進行中)
  - 原文: 「他の製品とかどう工夫してるんだろ？」(iter238 banner 実装の流れで)
  - 進捗:
    - [x] iter238: Linear / Asana 風「他の人が編集中」banner (externallyChanged 検出)
    - [x] iter252: 自動 retry on conflict — ConflictError 時に refetch → 最新 version で再 mutate (Linear / Notion 風)
    - [ ] field 単位 merge picker — 同一 field を両者が編集した場合の diff 表示 (設計中)
    - [ ] Realtime presence avatar — 誰が今 dialog を開いているか (設計中)
  - **要追加質問**: presence avatar は派手だが安全とは別軸。優先度どう?

---

## 処理済み

(空)
