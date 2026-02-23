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
make prod_build     # 本番用Dockerイメージビルド
```

ローカル直接実行: `bun run dev` (tsx経由)

## Architecture

エントリーポイント `src/index.ts` から2つのアプリが実行される:

- **schedule_notifier** (`src/apps/schedule_notifier.ts`): Google Calendarから7日分の予定を取得し、Gmail SMTP + Slackで通知
- **pic_of_garbage_disposal_notifier** (`src/apps/pic_of_garbage_disposal_notifier.ts`): Google Sheetsからゴミ捨て当番を管理。当番回数最小の人を選出し、Sheets更新 + Slack即時通知 + 月木10:00の予約投稿を作成

共通モジュール:
- `src/auth.ts` - Google API認証（secret.jsonのサービスアカウント使用）
- `src/notifier.ts` - メール送信(nodemailer)・Slack通知ロジック
- `src/types.ts` - 型定義
- `src/utils.ts` - ユーティリティ関数

## Code Style

- Biome使用（lint + format統合）
- インデント: タブ
- クォート: ダブルクォート
- TypeScript strict mode、ESModules (`"type": "module"`)
- パスエイリアス: `@/*` → `./src/*`

## Environment

`.env` に以下が必要: `PROJECT_ID`, `CALENDAR_ID`, `SHEET_ID`, `SLACK_OAUTH_TOKEN`, `MAIL_USER`, `MAIL_PASSWORD`, `ADRESS`, `EVENT_NOTIFY_CHANNEL_ID`, `PIC_NOTIFY_CHANNEL_ID`

Google API認証用の `secret.json`（サービスアカウントキー）がルートに必要。
