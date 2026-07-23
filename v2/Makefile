SHELL := /bin/bash
.DEFAULT_GOAL := help

BACKEND_DIR := backend
FRONTEND_DIR := frontend
RELEASE_NAME := project_release.zip

.PHONY: help develop test deploy clean all package

help:
	@echo "Targets: develop test deploy clean all package"

## ---- develop: install deps + scaffold frontend if missing + run dev servers ----
develop:
	@echo ">> [develop] Installing backend dependencies"
	cd $(BACKEND_DIR) && npm install
	@if [ ! -d "$(FRONTEND_DIR)/node_modules" ]; then \
		echo ">> [develop] Frontend deps missing — installing"; \
		cd $(FRONTEND_DIR) && npm install; \
	fi
	@echo ">> [develop] Starting backend and frontend dev servers"
	@( cd $(BACKEND_DIR) && npm run dev ) & \
	( cd $(FRONTEND_DIR) && npm run dev ) & \
	wait

## ---- test: lint + unit + integration, fail securely ----
test:
	@echo ">> [test] Backend lint"
	cd $(BACKEND_DIR) && npm run lint
	@echo ">> [test] Backend unit/integration tests"
	cd $(BACKEND_DIR) && npm test
	@echo ">> [test] Frontend lint"
	cd $(FRONTEND_DIR) && npm run lint
	@echo ">> [test] All checks passed"

## ---- deploy: build production artifacts and ship them ----
## Backend ships to Railway (root directory: backend, auto-deploys on git push).
## Frontend ships to Vercel (root: frontend, vercel.json).
## Vercel triggers automatically if the CLI is installed/logged in;
## otherwise this prints the exact manual steps and exits 0 (non-blocking),
## since a fresh clone won't have Vercel auth configured yet.
deploy: test
	@echo ">> [deploy] Building frontend production bundle"
	cd $(FRONTEND_DIR) && npm run build
	@echo ">> [deploy] Verifying backend env is configured"
	@test -f $(BACKEND_DIR)/.env || (echo "ERROR: backend/.env missing — copy from .env.example" && exit 1)
	@echo ">> [deploy] Backend deploy: Railway auto-deploys on every push to main"
	@echo "     once the service's Root Directory is set to 'backend' (one-time dashboard setup)."
	@if command -v vercel >/dev/null 2>&1; then \
		echo ">> [deploy] Deploying frontend via Vercel CLI"; \
		cd $(FRONTEND_DIR) && vercel --prod --yes; \
	else \
		echo ">> [deploy] Vercel CLI not found. Manual frontend deploy:"; \
		echo "     1. npm i -g vercel && vercel login"; \
		echo "     2. cd frontend && vercel --prod   (or connect the repo in the Vercel dashboard, root: frontend)"; \
		echo "     3. Set NEXT_PUBLIC_API_URL env var in Vercel to the live Render backend URL."; \
	fi

## ---- clean: clear caches, build artifacts, reset env ----
clean:
	@echo ">> [clean] Removing build artifacts and caches"
	rm -rf $(BACKEND_DIR)/node_modules
	rm -rf $(FRONTEND_DIR)/node_modules $(FRONTEND_DIR)/.next
	rm -f $(RELEASE_NAME)
	@echo ">> [clean] Done"

## ---- all: safe full chain ----
all: clean develop test deploy

## ---- package: bundle source + Makefile into a release zip ----
package:
	@echo ">> [package] Creating $(RELEASE_NAME)"
	zip -r $(RELEASE_NAME) . \
		-x "node_modules/*" -x "*/node_modules/*" \
		-x ".git/*" -x "*/.git/*" \
		-x ".next/*" -x "*/.next/*" \
		-x "*.env" -x "*/.env" \
		-x "$(RELEASE_NAME)"
	@echo ">> [package] Wrote $(RELEASE_NAME)"
