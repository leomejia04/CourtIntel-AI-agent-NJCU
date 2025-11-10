NPM ?= npm

.PHONY: install test backend frontend dev prisma

install:
	$(NPM) --prefix server install
	$(NPM) --prefix server run prisma:generate
	$(NPM) --prefix frontend install

test:
	$(NPM) --prefix server test

backend:
	$(NPM) --prefix server run dev

frontend:
	$(NPM) --prefix frontend run dev

dev:
	@echo "Run backend: npm --prefix server run dev"
	@echo "Run frontend: npm --prefix frontend run dev"

prisma:
	$(NPM) --prefix server run prisma:migrate

