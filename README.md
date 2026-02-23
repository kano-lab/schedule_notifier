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

実行用スクリプト(下記をcron等で定期実行)
```bash
docker run --env-file [env-file-path] notifier node dist/index.js
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

### 🕐 定期実行（Cron）

毎週日曜日の朝にスクリプトを実行することを推奨します。

まず、プロダクションビルドを行うと `notifier` という名前のDockerイメージが作成されます。
```bash
make prod_build
# 内部的には docker build -t notifier -f docker/Dockerfile . が実行される
```

このイメージはBunでビルドされたJSバンドルをNode.js上で実行する軽量な実行用イメージです。
`docker run` で起動すると通知処理を一度実行して終了するため、Cron等と組み合わせて定期実行できます。

以下はcrontabの設定例です。
```bash
# 毎週日曜日の午前7時に実行する場合
0 7 * * 0 docker run --rm --env-file /path/to/.env notifier
```

#### 実行時の動作

スクリプトが実行されると、以下の処理が順番に行われます。

1. **スケジュール通知**
   - Google Calendarから実行日を起点に7日分の予定を取得
   - 取得した予定をメール（Gmail SMTP）とSlackで即時通知

2. **ゴミ捨て当番通知**
   - Google Sheetsから研究室メンバーの当番回数を参照し、回数が最も少ない人を当番に選出
   - 選出された当番をSlackで即時通知
   - 月曜日と木曜日の10:00にリマインドするSlack予約投稿を作成
   - Google Sheetsの当番回数を自動でインクリメント

### format・lint
```bash
make format
make lint
```

### 📝 作成
馬場 海好  
mbaba@kanolab.net  
運用開始: 2024/7-
