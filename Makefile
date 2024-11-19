format:
	bunx biome format --write src

lint:
	bunx biome lint --write src

build:
	docker compose build

up:
	docker compose up -d

shell:
	docker compose exec bun bash
