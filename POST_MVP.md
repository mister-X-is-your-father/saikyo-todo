# POST_MVP.md — 1ヶ月 MVP 後にやる機能のバックログ

> ここにあるものを **MVP では実装しない**。完了したら横線で消すか別ファイルに移動。

## 🚩 MVP 完了直後に着手 (最優先)

### 稼働入力 (作業時間の記録) — **要件確定、実装着手中**

詳細仕様: [`docs/spec-time-entries.md`](docs/spec-time-entries.md)

- **方向性**: saikyo-todo で time_entry を作成 → Playwright worker が外部
  勤怠システム (MVP は mock) のフォームを自動入力する
- **MVP スコープ**: Mock Timesheet ページ + `time_entries` テーブル +
  手動 Sync ボタン + Playwright worker 経由の送信 (AI 要素なし)
- **実装フェーズ**: schema → Mock Timesheet → saikyo-todo UI → Playwright worker →
  受け入れ検証スクリプト拡張 (合計 4 フェーズ)

---

## AI Agent 拡張

- [x] ~~**Engineer Agent** (コード書き) + git worktree 隔離 + サンドボックス実行~~ → **Phase 6.12 完了** (autoPr=false 既定 / claude CLI 経由 / 人間 review 必須)
- [ ] **Reviewer Agent** (PR / Doc / Item 出力の相互レビュー)
- [x] ~~PM Agent の **Pre-mortem** (リスク予測 / 過去遅延パターン照合)~~ → **Phase 6.8 完了**
- [x] ~~PM Agent の **依存ブロック検出** (item_dependencies グラフ走査)~~ → **Phase 6.10 完了** (Pre-mortem prompt に injected)
- [ ] **二重承認** (MUST 追加 / 降格に PM Agent 承認必須)
- [ ] Researcher の **Web 調査 tool** (web_fetch + サニタイズ)
- [x] ~~Agent **キャンセルトークン** (実行中 invocation を中断)~~ → **Phase 6.7 完了**
- [ ] Agent 出力 **承認待ち** モード (`auto_apply: false`)
- [ ] **複数 AI モデル切替** (provider 抽象化)
- [ ] **Vibe Kanban スタイル**: 同じ Item に複数 Engineer Agent 並列で結果比較

## Doc / コラボ

- [ ] **Yjs/Tiptap collab** で Doc 同時編集 (CRDT) + Hocuspocus サーバ
- [ ] @mention 通知連動 (Item / Doc / Comment 内)
- [ ] **絵文字リアクション** on Comment / Item
- [ ] Doc バージョン履歴 + diff
- [ ] Doc コメント (現状は doc 全体 comment のみ)

## ファイル / 添付

- [ ] **添付ファイル UI** + Supabase Storage アップロード
- [ ] 画像インライン表示 (Doc / Comment 内)
- [ ] mime / size 制限 + ウイルススキャン

## 通知 / 配信

- [x] ~~**メール通知** (Resend or SMTP) + react-email テンプレ~~ → **Phase 6.6 で mock outbox 完成**。実 SMTP/Resend は dispatcher.ts 1 ファイル差し替えで本番化可能
- [ ] **Slack 通知** (incoming webhook)
- [ ] 通知 **digest** (1 日まとめて配信)
- [x] ~~**通知購読設定 UI** (`notification_preferences` の編集)~~ → **Phase 6.6 完了** (NotificationPreferences Popover)
- [ ] PM Agent Stand-up の **個人別 DM** + 購読 ON/OFF

## ビュー / UX

- [ ] **Gantt 依存線** + ドラッグ + dependencies 編集 UI (React Flow)
- [ ] Gantt の **クリティカルパス可視化**
- [ ] **WIP 制限のブロック動作** (現状は警告のみ)
- [ ] **動的フォーム拡張** (multi-select / formula / relation / file)
- [ ] **カスタムフィールドのフル実装** (FieldPlugin の jsonb 内インデックス)
- [ ] **ゴミ箱 UI** (`deleted_at` 復元 + 30日後 hard delete cron)
- [ ] **ワークスペース削除** (soft → 30日 → hard)
- [ ] **アーカイブビュー** (`archived_at` の Item 一覧)
- [ ] **タグ正規化** + autocomplete + tag rename / merge UI
- [ ] **検索結果ハイライト** (snippet + マッチ語強調)
- [ ] Workspace 切替 UI 改善
- [x] ~~**キーボードショートカット一覧** モーダル~~ → **Phase 6.5 完了** (`?` 押下 / Command Palette)

## Plugin / 拡張

- [ ] **動的プラグインロード**
- [ ] **プラグインマーケット / プリセット**
- [ ] **API token / PAT** + REST API
- [ ] **Webhook 受信 / 送信**
- [ ] **MCP サーバ化**

## 観測 / 運用

- [ ] **監査ログの UI / 検索**
- [ ] **ログ集約** (Loki + Grafana)
- [ ] **Sentry 連携** (self-hosted)
- [x] ~~AI コストの **workspace 月次上限** + 警告 / 自動停止~~ → **Phase 6.9 完了** (BudgetPanel + checkBudget pre-flight)
- [ ] **Uptime monitor**
- [ ] DB バックアップの **オフサイト転送** (rclone)

## 検索 / RAG 改善

- [ ] **bigm → pgroonga 移行** (もし bigm 精度不足なら)
- [ ] **multilingual-e5-large へのアップグレード** (GPU 入手時, 1024 次元)
- [ ] embedding を **TEI** コンテナで分離
- [ ] **Reranker** (cross-encoder)

## モバイル / オフライン

- [x] ~~**モバイル対応** (PWA + レスポンシブ)~~ → **Phase 6.11 完了** (manifest + sw.js + offline page + icon dynamic gen)。レスポンシブ調整は継続課題
- [ ] **オフライン同期** (Service Worker + IndexedDB) — SW 土台はあるので IndexedDB cache を載せれば実装可

## i18n

- [ ] **英語翻訳** (`messages/en.json`)

## 受け入れ未満

- [ ] **エスカレーション 4 段目 Xh 直前**
- [ ] Stand-up の **タイムゾーン個人別** override

---

_完了したら本書から削除し、REQUIREMENTS.md に移すこと。_
