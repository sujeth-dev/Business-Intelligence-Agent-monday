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
## Backend ships to Render (render.yaml blueprint, root: backend).
## Frontend ships to Vercel (root: frontend, vercel.json).
## Automatic triggers only fire if you export the relevant env vars/CLIs;
## otherwise this prints the exact manual steps and exits 0 (non-blocking),
## since a fresh clone won't have Render/Vercel auth configured yet.
deploy: test
	@echo ">> [deploy] Building frontend production bundle"
	cd $(FRONTEND_DIR) && npm run build
	@echo ">> [deploy] Verifying backend env is configured"
	@test -f $(BACKEND_DIR)/.env || (echo "ERROR: backend/.env missing — copy from .env.example" && exit 1)
	@if [ -n "$$RENDER_DEPLOY_HOOK_URL" ]; then \
		echo ">> [deploy] Triggering Render deploy hook for backend"; \
		curl -fsSL -X POST "$$RENDER_DEPLOY_HOOK_URL"; \
	else \
		echo ">> [deploy] RENDER_DEPLOY_HOOK_URL not set. Manual backend deploy:"; \
		echo "     1. Push this repo to GitHub."; \
		echo "     2. On Render: New -> Blueprint -> select repo (uses render.yaml)."; \
		echo "     3. Fill in MONDAY_API_TOKEN, MONDAY_WORKORDERS_BOARD_ID, MONDAY_DEALS_BOARD_ID, OPENAI_API_KEY, FRONTEND_ORIGIN."; \
		echo "     4. Copy the live Render URL for the frontend's NEXT_PUBLIC_API_URL."; \
		echo "     (Next time: create a Deploy Hook on the Render service and export RENDER_DEPLOY_HOOK_URL to automate this step.)"; \
	fi
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
