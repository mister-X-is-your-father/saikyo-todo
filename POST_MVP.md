# POST_MVP.md — 1ヶ月 MVP 後にやる機能のバックログ

> ここにあるものを **MVP では実装しない**。完了したら横線で消すか別ファイルに移動。

## AI Agent 拡張

- [ ] **Engineer Agent** (コード書き) + git worktree 隔離 + サンドボックス実行
- [ ] **Reviewer Agent** (PR / Doc / Item 出力の相互レビュー)
- [ ] PM Agent の **Pre-mortem** (リスク予測 / 過去遅延パターン照合)
- [ ] PM Agent の **依存ブロック検出** (item_dependencies グラフ走査)
- [ ] **二重承認** (MUST 追加 / 降格に PM Agent 承認必須)
- [ ] Researcher の **Web 調査 tool** (web_fetch + サニタイズ)
- [ ] Agent **キャンセルトークン** (実行中 invocation を中断)
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

- [ ] **メール通知** (Resend or SMTP) + react-email テンプレ
- [ ] **Slack 通知** (incoming webhook)
- [ ] 通知 **digest** (1 日まとめて配信)
- [ ] **通知購読設定 UI** (`notification_preferences` の編集)
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
- [ ] **キーボードショートカット一覧** モーダル

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
- [ ] AI コストの **workspace 月次上限** + 警告 / 自動停止
- [ ] **Uptime monitor**
- [ ] DB バックアップの **オフサイト転送** (rclone)

## 検索 / RAG 改善

- [ ] **bigm → pgroonga 移行** (もし bigm 精度不足なら)
- [ ] **multilingual-e5-large へのアップグレード** (GPU 入手時, 1024 次元)
- [ ] embedding を **TEI** コンテナで分離
- [ ] **Reranker** (cross-encoder)

## モバイル / オフライン

- [ ] **モバイル対応** (PWA + レスポンシブ)
- [ ] **オフライン同期** (Service Worker + IndexedDB)

## i18n

- [ ] **英語翻訳** (`messages/en.json`)

## 受け入れ未満

- [ ] **エスカレーション 4 段目 Xh 直前**
- [ ] Stand-up の **タイムゾーン個人別** override

---

_完了したら本書から削除し、REQUIREMENTS.md に移すこと。_
