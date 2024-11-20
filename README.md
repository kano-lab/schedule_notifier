# 狩野研スケジュールアラートBot

### ⭐️ 概要
狩野研究室のスケジュールをGoogleカレンダーから取得し、指定した時間にSlackとメール通知を行うBotです。
また、研究室のゴミ出し担当者を自動で決定し、通知する機能もあります。

### 📅 機能・運用方法

機能としては以下の通りです。
- 研究室のスケジュールをGoogleカレンダーから取得し、即時Slackとメール通知を行う
- その週のゴミ出し担当者を自動で決定し、即時Slack通知する
- その週のゴミ出し担当者に対して、月曜と木曜にSlack通知を行うような予約投稿を作成する

スクリプトが実行された際に上記処理が行われるため、運用としてはCron等で定期的にスクリプトを実行することを想定しています。
スケジュール通知の都合上、毎週日曜日の朝にスクリプトを実行することを推奨します。

### 📦 使用技術
- Docker
- TypeScript
- Google Calendar API
- Google Sheets API
- Slack API


### 📝 ビルド
```bash
make prod_build
```

### 🛠️ 環境構築

1. 開発環境用のDockerコンテナのビルド

```bash
make build
```
2. .env及びcredentials.jsonの設定
[ここ](https://drive.google.com/drive/folders/1A-HEyTCv6MhA7DP1qwHNGEIbnKRW8B7z?usp=sharing)から各種ファイルをDLし、ルートディレクトリに配置してください。

3. Dockerコンテナの起動及び依存関係の解決
```bash
make up
make shell
bun install
```
`bun install`はdockerコンテナ内で実行してください。

4. スクリプトの実行
```bash
make exec
```

5. Dockerコンテナの停止
```bash
make down
```

### format・lint
```bash
make format
make lint
```

### 📝 作成
馬場 海好  
mbaba@kanolab.net  
運用開始: 2024/7-
