# ビルドステージ: Bunを使用してパッケージのインストールとビルドを行う
FROM oven/bun:1.1.20-debian as builder
ENV TZ Asia/Tokyo
WORKDIR /app

# ソースコードとパッケージ設定をコピー
COPY package.json bun.lockb ./
# 高速なパッケージインストール
RUN bun install --frozen-lockfile

# ソースコードをコピーしてビルド
COPY . .
RUN bun run build

# 実行ステージ: Node.jsを使用して実行する
FROM node:20-slim
ENV TZ Asia/Tokyo
WORKDIR /app

# builderステージからビルド成果物と必要なファイルをコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/secret.json ./
COPY --from=builder /app/node_modules ./node_modules

# Node.jsで実行
CMD ["node", "dist/index.js"]
