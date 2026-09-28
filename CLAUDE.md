# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

狩野研究室のスケジュール通知Bot。Google Calendar/Sheets APIからデータを取得し、Slackとメールで研究室メンバーに通知する。Cron等で毎週日曜朝に実行する想定。
また、ゴミ捨て当番の自動選出と通知も行う。こちらはSlackへの即時通知と、月木10:00の予約投稿を作成する。

## Development Commands

開発はDocker内で行う（bunランタイム使用）。

```bash
make build          # 開発用Dockerコンテナビルド
make up             # コンテナ起動
make shell          # コンテナ内シェルに入る（bun installはここで実行）
make exec           # スクリプト実行 (bun run src/index.ts)
make down           # コンテナ停止
make format         # bunx biome format --write src
make lint           # bunx biome lint --write src
make test           # TZ=Asia/Tokyo bun test （全テスト実行）
make prod_build     # 本番用Dockerイメージビルド
```

ローカル直接実行: `bun run dev` (tsx経由)

### テスト

テストは `bun:test` を使用。日付整形ロジックがローカルタイム依存（`getHours()` 等）のため、**必ず `TZ=Asia/Tokyo` を付けて実行する**こと。指定しないと結果がずれてテストが落ちる。

```bash
TZ=Asia/Tokyo bun test src/utils.test.ts        # 単一ファイルのみ実行
TZ=Asia/Tokyo bun test -t "終日イベント"          # テスト名で絞り込み実行
```

本番ビルドは `bun run build`（`tsc` → `tsc-alias` → `fix-esm-import-path`）で `dist/` を生成し、`node dist/index.js` で実行する。`make exec`（bun実行）と本番（node実行）でランタイムが異なる点に注意。

## Architecture

エントリーポイント `src/index.ts` から2つのアプリが実行される:

- **schedule_notifier** (`src/apps/schedule_notifier.ts`): Google Calendarから7日分の予定を取得し、Gmail SMTP + Slackで通知
- **pic_of_garbage_disposal_notifier** (`src/apps/pic_of_garbage_disposal_notifier.ts`): Google Sheetsからゴミ捨て当番を管理。当番回数最小の人を選出し、Sheets更新 + Slack即時通知 + 月木10:00の予約投稿を作成

共通モジュール:
- `src/auth.ts` - Google API認証（secret.jsonのサービスアカウント使用）
- `src/notifier.ts` - メール送信(nodemailer)・Slack通知ロジック
- `src/types.ts` - 型定義
- `src/utils.ts` - ユーティリティ関数

### 設計上のパターン

- **依存性注入**: `index.ts` で `getAuth()` → `getGoogleCalendar()` / `getGoogleSpreadsheet()` を組み立て、各アプリの `scheduleNotify(calendar)` / `picNotify(spreadsheet)` に渡す。APIクライアントを外から注入する形なので、I/Oを分離してテストしやすい。
- **純粋関数のexport**: メッセージ生成・パース・日付計算（`createEventStr`, `parseMembers`, `getAllWeekDates` 等）は副作用のある entry point から切り出して個別にexportし、ユニットテスト対象にしている。**ロジックを追加する際はこの純粋関数パターンを踏襲する**こと。
- **予約投稿の過去時刻スキップ**: `picNotify` は月木10:00の予約投稿を作成するが、実行時点より過去の時刻はSlack APIエラーになるため `Date.now()` と比較してフィルタしている。

## Code Style

- Biome使用（lint + format統合）
- インデント: タブ
- クォート: ダブルクォート
- TypeScript strict mode、ESModules (`"type": "module"`)
- パスエイリアス: `@/*` → `./src/*`

## Environment

`.env` に以下が必要: `PROJECT_ID`, `CALENDAR_ID`, `SHEET_ID`, `SLACK_OAUTH_TOKEN`, `MAIL_USER`, `MAIL_PASSWORD`, `ADRESS`, `EVENT_NOTIFY_CHANNEL_ID`, `PIC_NOTIFY_CHANNEL_ID`

Google API認証用の `secret.json`（サービスアカウントキー）がルートに必要。

> NOTE: 下記GCP移行が完了すると、Google API の認証は研究室共用 Gmail アカウント（`MAIL_USER`）のユーザーOAuthに統一され、`secret.json` ファイルは不要になる。メール送信は Gmail API に切り替わり、`MAIL_PASSWORD` の代わりに `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` が必要になる。

## GCP移行 実装計画 (Terraform)

> インフラ構成・認証方式の「決定事項と背景・理由」は **`docs/infrastructure.md`** を参照。本セクションは**実装手順のみ**を扱う。

### 責務の分担

| 領域 | 担当 |
|---|---|
| API有効化 / Artifact Registry / SA / IAM / Secret Manager(箱) / Cloud Run Job / Cloud Scheduler | **Terraform** (`terraform/`) |
| イメージの build & push | Makefile (`make image`) |
| Secretの**値**投入（TF stateに値を残さないため値はTF管理外） | Makefile (`make secrets-push`) |
| e2e / lint / format / test / TFラッパー(init/plan/apply) | Makefile |
| Calendar/Spreadsheet の `MAIL_USER` への共有 | **手動**（Terraform不可） |
| OAuth 同意画面・OAuth クライアント作成 / リフレッシュトークン取得 | **手動**（トークン取得はスクリプトを手元で実行） |

### 手順（段階的に・差分を小さく）

**Step 1 — 既存バグの修正（[#16](https://github.com/kano-lab/schedule_notifier/issues/16)）**
- `picNotify`: 当番通知の結果を `await` し、`ts` を予約投稿の `thread_ts` に渡す
- `slackPayload.thread_ts` を `string` 型にし、`// @ts-ignore` を削除
- 各送信処理（Slack・メール）を `await` し、失敗時はプロセスを異常終了させる
- `src/index.ts`: `main` を `async` 化し `scheduleNotify`/`picNotify` を `await`

**Step 2 — Google API 認証のユーザーOAuth統一・Gmail API への切り替え**
- GCP プロジェクトを決定し、`calendar-json` / `sheets` / `gmail` API を**手動で**有効化（Step 3 で Terraform に取り込む）
- OAuth 同意画面を作成（External・スコープ `gmail.send` / `calendar.readonly` / `spreadsheets`）し、**本番環境に公開**（テストのままだとリフレッシュトークンが7日で失効する）
- OAuth クライアント（**デスクトップアプリ**）を作成
- 対象 Calendar・Spreadsheet を `MAIL_USER` に共有（当番表は編集権限）
- リフレッシュトークン取得スクリプトを追加（手元で実行 → ブラウザで同意 → `localhost` で認可コードを受け取りトークンを表示）
- `src/auth.ts`: `GoogleAuth` + `keyFile: "secret.json"` をやめ、`google.auth.OAuth2` + リフレッシュトークン（`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN`）に置き換え
- `src/notifier.ts`: `mail_notify` を nodemailer(SMTP) から Gmail API（`gmail.users.messages.send`）に置き換え。RFC 2822 メッセージ組み立て（日本語件名の MIME エンコード・base64url）は純粋関数として切り出してテストする。`nodemailer` を依存から削除
- `docker/Dockerfile`: `COPY --from=builder /app/secret.json ./` を削除
- テスト用設定を用意（`ADRESS` → 自分のメール / `EVENT_NOTIFY_CHANNEL_ID`・`PIC_NOTIFY_CHANNEL_ID` → テスト用チャンネル / `SHEET_ID` → 当番表の**コピー**）し、手元で実行して確認

**Step 3 — Terraform 基盤（state・API有効化）**
- state 用 GCS バケットを作成（バージョニング有効）
- `terraform/` に provider・backend・variables を用意
- `google_project_service` で API有効化（`run` / `cloudscheduler` / `secretmanager` / `artifactregistry` / `calendar-json` / `sheets` / `gmail`）。Step 2 で手動有効化した API は import で取り込む
- `terraform apply`

**Step 4 — 実行基盤のデプロイ (Terraform)**
- `google_artifact_registry_repository`（クリーンアップポリシー付き）→ `make image`（build → push）
- `google_service_account`（Job実行用）
- `google_secret_manager_secret`（`SLACK_OAUTH_TOKEN` / `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` の**箱だけ**）+ Job用SAへ `roles/secretmanager.secretAccessor`
- `make secrets-push` で値を投入
- `google_cloud_run_v2_job`（Job用SA / 通常env / secret参照env / 上記イメージ）
- Scheduler用SA + `google_cloud_run_v2_job_iam_member`（`roles/run.invoker`）
- `google_cloud_scheduler_job`（`http_target`: `https://run.googleapis.com/v2/.../jobs/JOB:run` / `oauth_token`）
- ⚠️ 宛先が研究室全体のため、Job の env を一時的にテスト用設定にして `gcloud run jobs execute` を**1回だけ**実行し、Secret 注入・OAuth 認証を確認 → 本番宛先へ切替
- 本番宛先に切替後、翌週の Cloud Scheduler 自動実行を確認

**Step 5 — ローカル開発環境の整備**
- Secret Manager の値を取得して手元の `.env` に反映する仕組み（Makefile）
- テスト用設定での e2e テストの整備

**Step 6 — ドキュメント整備**
- CLAUDE.md の Architecture・Environment・Development Commands を移行後の構成に更新
- ローカル開発・検証手順のドキュメント化
