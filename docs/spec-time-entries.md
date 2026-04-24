# 稼働入力機能 (time-entries) — 要件定義

> POST_MVP.md 先頭の 🚩「稼働入力」の詳細仕様。
> MVP 1 本目として着手、AI 要素はなし。後から拡張する前提。

## 1. 目的

saikyo-todo の Item 作業に対する **実作業時間 + やったこと** を記録し、
外部の勤怠 / タイムシート Web システム (= Playwright で操作する対象) に
**自動入力** する。

手動で外部フォームを埋める手間をなくす + saikyo-todo の Item と実時間を
紐付けて見積/実績ギャップを可視化する準備を整える。

## 2. スコープ

### IN (MVP)

- `time_entries` テーブル + CRUD (workspace_id + RLS)
- 入力 UI: Item 紐付け / 日付 / カテゴリ (プルダウン) / 作業内容 (フリーテキスト) / 時間
- **Mock Timesheet** (saikyo-todo と同じ Next.js アプリ内の別ルート) 経由で
  Playwright の動作検証
- Sync 起動: 手動「Sync」ボタン (ユーザ操作) → pg-boss キュー
- Playwright worker: ログイン → フォーム入力 → 送信 → `external_ref` 取得
- 成功/失敗の DB 記録 + audit + UI バッジ
- 越境防御: workspace 外の time_entry を見せない / 書けない (既存 RLS 踏襲)

### OUT (POST_MVP で別途)

- 実在の外部システム連携 (freee / TeamSpirit / Jira 等) — 本 MVP は Mock のみ
- AI によるフィールド推定 (description から category を推測する等)
- Item 見積値との突合 (`items.estimated_minutes` は本 spec では追加しない)
- 承認フロー (上長承認)
- タイマー連続記録 (開始/停止ボタン) — MVP は duration 直接入力
- CSV / 月次レポート出力
- 複数外部システム同時 sync

## 3. ユーザーストーリー

1. **作業者が記録する**: ユーザは Backlog / Item 詳細画面から「稼働記録」を
   作成。Item 紐付け (任意)、日付、カテゴリ、作業内容、時間 (分) を入力。
2. **手動で外部へ送る**: 一覧画面の各 entry 右側に「Sync」ボタン。クリックで
   pg-boss キュー送信 → worker が Playwright で mock-timesheet に反映。
3. **状態を確認する**: 一覧に `sync_status` バッジ (pending / synced / failed)。
   failed のものは「再 Sync」で retry できる。

## 4. データモデル

### 4.1 `time_entries` (新規)

| col                                            | type                   | note                                                 |
| ---------------------------------------------- | ---------------------- | ---------------------------------------------------- |
| id                                             | uuid pk                |                                                      |
| workspace_id                                   | uuid fk workspaces     | RLS scope                                            |
| user_id                                        | uuid fk auth.users     | 作業者                                               |
| item_id                                        | uuid fk items nullable | 対象 Item。null 可 (自由記録)                        |
| work_date                                      | date                   | 勤務日 (client TZ 前提、UTC に丸めない)              |
| category                                       | text                   | 後述 4.3 の固定カテゴリ key                          |
| description                                    | text                   | 「やったこと」フリーテキスト 1-2000 文字             |
| duration_minutes                               | int                    | 1 以上 (上限 1440 = 24h)                             |
| sync_status                                    | text                   | enum: 'pending' / 'synced' / 'failed' (drizzle enum) |
| sync_attempts                                  | int default 0          | retry カウンタ                                       |
| sync_error                                     | text nullable          | 最新 Playwright エラー (末尾 2000 字)                |
| external_ref                                   | text nullable          | 送信成功時に mock 側で返す id                        |
| created_at / updated_at / version / deleted_at | 既存規約通り           |                                                      |

インデックス:

- `(workspace_id, work_date desc)` — 一覧取得用
- `(sync_status) WHERE sync_status='pending'` — worker 選択用 (部分 idx)

RLS:

- SELECT: workspace member
- INSERT / UPDATE: 本人 (user_id = auth.uid()) のみ、かつ workspace member
- DELETE: 行わない (soft delete、updated_at は楽観ロック)

### 4.2 `mock_timesheet_entries` (mock 側、saikyo-todo から完全に独立した論理テーブル)

> saikyo-todo の RLS / features の外。Playwright が書き込む先。
> 実在外部システムに置き換える時にここだけ消せるように命名で区切る。

| col           | type                      | note                         |
| ------------- | ------------------------- | ---------------------------- |
| id            | uuid pk                   |                              |
| session_id    | text                      | ログインユーザ (mock の概念) |
| work_date     | date                      |                              |
| category      | text                      | mock のプルダウン value      |
| description   | text                      |                              |
| hours_decimal | numeric(4,2)              | 0.25 刻み                    |
| submitted_at  | timestamptz default now() |                              |

### 4.3 カテゴリ (enum 相当、定数ファイルで管理)

`src/features/time-entry/categories.ts` に key+label を定義:

- `dev` — 開発
- `meeting` — MTG
- `research` — 調査
- `ops` — 運用
- `other` — その他

saikyo-todo 側も mock 側も同じ 5 カテゴリを使う。将来拡張容易なように
DB に入れず定数で管理 (MVP 優先)。

## 5. 画面 / API

### 5.1 saikyo-todo (既存アプリ内)

- `/w/[workspaceId]/time-entries` — 一覧 + 作成フォーム
  - 上部: 作成フォーム (Item select / date / category select / description textarea / minutes)
  - 下部: 一覧 table (date / item / category / description prefix / minutes / sync バッジ / Sync ボタン)
- Server Actions:
  - `createTimeEntryAction(input): Result<{id}>`
  - `syncTimeEntryAction(id): Result<{status}>` — pg-boss enqueue のみ、同期で投げる
  - `retryTimeEntrySyncAction(id)` — failed のみ対象、sync_attempts++
- hooks.ts で TanStack Query (楽観更新あり)
- プラグイン登録: action plugin 1 本 "Sync to Timesheet" (Backlog 行にも表示可)

### 5.2 Mock Timesheet (新ルート、同アプリ)

- `/mock-timesheet/login` — ID/PW 固定 (env or hardcoded dummy) / cookie 付与
- `/mock-timesheet/new` — フォーム: date / category プルダウン / description textarea / hours (step=0.25) / 送信ボタン
- `/mock-timesheet/entries` — 送信済一覧 (Playwright 検証用に見える場所)
- DB: `mock_timesheet_entries` を drizzle で定義 (同じ DB)
- RLS は**かけない** (mock なので)。他 workspace からも全件見える → それでよい

## 6. Sync ワーカー

### 6.1 新 pg-boss キュー `time-entry-sync`

- handler: `src/features/time-entry/worker.ts`
- ジョブ payload: `{ entryId: string }`
- 処理:
  1. time_entry row を admin で引く。`sync_status='pending' | 'failed'` のみ処理
  2. `sync_attempts++`, `sync_status='syncing'` (_新 enum 値入れるか、最大 retry=3 で判定_)
  3. Playwright で mock-timesheet にアクセス:
     - `await page.goto('/mock-timesheet/login')`
     - ID/PW を env から読み込み POST
     - `/mock-timesheet/new` でフォーム埋め
     - `await page.click('submit')`
     - 成功 URL か toast を wait し、`data-external-ref` を取得
  4. `sync_status='synced'`, `external_ref=...` で update + audit
  5. 例外時は `sync_status='failed'`, `sync_error=...` で update + audit

### 6.2 Playwright 実行環境

- 既存の `playwright` パッケージ (E2E 用) を再利用
- Chromium はローカル dev なら `playwright install chromium` 済み前提
- Docker では `Dockerfile.worker` に `npx playwright install --with-deps chromium`
  を後で追加 (MVP の本番デプロイ時)

### 6.3 Mock Timesheet 側セレクタ

Playwright driver 側と mock 側で揃えるため、mock の form 要素には
`data-testid` を付ける:

- `#tsEmail`, `#tsPassword`, `#tsLoginSubmit`
- `#tsDate`, `#tsCategory` (select), `#tsDescription`, `#tsHours`, `#tsSubmit`
- 送信結果の `[data-external-ref="..."]`

driver 側はこれらを `page.fill('#tsDate', ...)` で操作。

## 7. 実装計画 (段階別)

### Phase 0: schema / feature 雛形 (TDD: failing test 先行)

- drizzle schema `time_entries` + `mock_timesheet_entries` マイグレーション
- RLS policy
- `src/features/time-entry/{schema,repository,service,service.test}.ts`
- 作成 + 一覧の happy path test

### Phase 1: Mock Timesheet ページ

- `/mock-timesheet/login`, `/new`, `/entries` (Server Action で直 insert)
- data-testid を付ける
- RLS 無しで書ける admin path

### Phase 2: saikyo-todo UI

- `/w/[wsId]/time-entries` ページ + 作成フォーム + 一覧 + Sync ボタン
- action plugin "Sync to Timesheet" で Backlog 行にも導線

### Phase 3: Playwright worker

- `src/features/time-entry/worker.ts` — pg-boss handler
- `src/features/time-entry/playwright-driver.ts` — chromium launch / login / submit
- Vitest integration test: mock-timesheet へ実ブラウザで送信して `mock_timesheet_entries` に行があることを確認

### Phase 4: 受け入れ検証スクリプト拡張

- `scripts/verify-acceptance.ts` に:
  1. time_entry を 1 件作成
  2. sync enqueue → worker で処理
  3. mock_timesheet_entries に対応行があることを確認
- MVP 同様 8/8 → 9/9 に増える

## 8. 未決事項 (実装着手前に詰める)

1. **`item_id` 紐付けは必須?** → MVP では nullable 可 (自由入力も許す) とする
2. **sync の同期 or 非同期表示?** → pg-boss キュー + 一覧画面で optimistic → realtime 購読
3. **mock のログイン cookie はブラウザセッション再利用する?** → 各 job で新規ログイン (シンプル)
4. **failed retry の上限** → 3 回まで。超えたら UI で明示、ユーザ手動再試行
5. **Playwright chromium を pg-boss worker で常駐起動するか、ジョブごと launch/close?** →
   ジョブごと launch (~500ms 追加だが独立性高い、MVP では十分)

## 9. テスト戦略

- Service: Vitest integration (実 Supabase)、repository + service の happy + 権限 + 楽観ロック
- Worker: `playwright-driver` を driver DI (inject) にしてモック化可能な形で書く。
  実 Chromium を使う統合テストは 1 本だけ (Phase 3)
- E2E: 現状の golden-path に time_entry 作成 + sync ボタン確認を追加
- verify-acceptance.ts に 1 ケース増設 (Phase 4)

## 10. 受け入れ基準

- [ ] `time_entries` に 1 件作成でき、一覧に表示される
- [ ] 「Sync」ボタンで `sync_status='pending'` → worker 経由で `'synced'`
- [ ] 対応する `mock_timesheet_entries` に行が作られ、category / description /
      hours が一致している
- [ ] 失敗時 `sync_status='failed'` + `sync_error` が UI に表示される
- [ ] 別 workspace の time_entry は見えない / 書けない
- [ ] `verify-acceptance.ts` に追加ケースが PASS

## 11. 将来拡張 (POST_MVP 末尾に置く)

- AI でカテゴリ推定 (description → category)
- 実在の外部システム Adapter (OAuth / 2FA / CSRF 対応)
- 複数外部システム同時 sync + 差分管理
- Item 見積値との突合 → Dashboard に見積/実績ギャップグラフ
- タイマー連続記録 UI (start/stop ボタン)
- CSV 月次レポート / workspace 管理者向け集計
- 承認フロー
