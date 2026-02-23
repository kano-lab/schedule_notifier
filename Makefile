format:
	bunx biome format --write src

lint:
	bunx biome lint --write src

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

shell:
	docker compose exec bun bash

exec:
	docker compose exec bun bun run src/index.ts

test:
	TZ=Asia/Tokyo bun test

prod_build:
	docker build -t notifier -f docker/Dockerfile .

