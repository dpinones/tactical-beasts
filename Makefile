# Rock Paper Scissors — Dev Commands

CONTRACTS_DIR = contracts

# ─── Default: Start Frontend ─────────────────────────────────

all: dev

# ─── Blockchain ───────────────────────────────────────────────

katana:
	katana --dev --dev.no-fee --http.cors_origins "*"

setup: build migrate generate torii

build:
	cd $(CONTRACTS_DIR) && sozo build

test:
	cd $(CONTRACTS_DIR) && sozo test

migrate:
	cd $(CONTRACTS_DIR) && sozo migrate

torii:
	@WORLD_ADDR=$$(python3 -c "import json; print(json.load(open('$(CONTRACTS_DIR)/manifest_dev.json'))['world']['address'])" 2>/dev/null); \
	if [ -z "$$WORLD_ADDR" ]; then echo "Error: world address not found. Run 'make setup' first."; exit 1; fi; \
	echo "Starting Torii with world address: $$WORLD_ADDR"; \
	torii --world $$WORLD_ADDR --rpc http://localhost:5050/rpc/v0_9 --http.cors_origins "*"

# ─── Frontend ─────────────────────────────────────────────────

install:
	npm install --legacy-peer-deps

dev:
	npm run dev

generate:
	npm run generate

front-build:
	npm run build

# ─── Sepolia ─────────────────────────────────────────────

migrate-sepolia:
	cd $(CONTRACTS_DIR) && sozo -P sepolia build && sozo -P sepolia migrate

dev-sepolia:
	npm run dev:sepolia

build-sepolia:
	npm run build:sepolia

torii-sepolia:
	@WORLD_ADDR=$$(python3 -c "import json; print(json.load(open('$(CONTRACTS_DIR)/manifest_sepolia.json'))['world']['address'])" 2>/dev/null); \
	if [ -z "$$WORLD_ADDR" ]; then echo "Error: world address not found. Run 'make migrate-sepolia' first."; exit 1; fi; \
	echo "Starting Torii for Sepolia with world address: $$WORLD_ADDR"; \
	torii --world $$WORLD_ADDR --rpc https://api.cartridge.gg/x/starknet/sepolia --http.cors_origins "*"

# ─── Mainnet ─────────────────────────────────────────────

migrate-mainnet:
	cd $(CONTRACTS_DIR) && sozo -P mainnet build && sozo -P mainnet migrate

dev-mainnet:
	npm run dev:mainnet

build-mainnet:
	npm run build:mainnet

torii-mainnet:
	@WORLD_ADDR=$$(python3 -c "import json; print(json.load(open('$(CONTRACTS_DIR)/manifest_mainnet.json'))['world']['address'])" 2>/dev/null); \
	if [ -z "$$WORLD_ADDR" ]; then echo "Error: world address not found. Run 'make migrate-mainnet' first."; exit 1; fi; \
	echo "Starting Torii for Mainnet with world address: $$WORLD_ADDR"; \
	torii --world $$WORLD_ADDR --rpc https://api.cartridge.gg/x/starknet/mainnet --http.cors_origins "*"

# ─── Slot ─────────────────────────────────────────────────────

slot-deploy:
	@echo "Deploy to Slot: slot deployments create <name>"
	@echo "Then: cd $(CONTRACTS_DIR) && sozo build && sozo -P slot migrate"

# ─── Helpers ──────────────────────────────────────────────────

fmt:
	cd $(CONTRACTS_DIR) && scarb fmt

fmt-check:
	cd $(CONTRACTS_DIR) && scarb fmt --check

.PHONY: all katana setup build test migrate torii install dev generate front-build migrate-sepolia dev-sepolia build-sepolia torii-sepolia migrate-mainnet dev-mainnet build-mainnet torii-mainnet slot-deploy fmt fmt-check
