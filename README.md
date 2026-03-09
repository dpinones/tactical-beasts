# Tactical Beasts

PvP 1v1 turn-based tactical game on Starknet. Each player builds a team of 3 beast NFTs from Loot Survivor and battles on a hex grid with obstacles.

Part of the [Provable Games](https://docs.provable.games/) ecosystem — beasts, combat formulas, and tournament integration come from the shared onchain infrastructure.

## Gameplay

### Flow

1. **Find Match** or **Invite a Friend** — matchmaking pairs you with an opponent, or create a private game with custom rules.
2. **Select Team** — pick 3 beasts from your NFT collection. Team composition is validated onchain (tier limits, subclass balance).
3. **Battle** — alternating turns on a hex board. Move, attack, or use consumables. Contract resolves damage, passives, crits, and counterattacks.
4. **Result** — winner determined when all opposing beasts are KO'd. Stats and score recorded onchain.

### The Board

- Hex grid with rows `[6, 7, 8, 7, 8, 7, 6]`.
- 6 obstacles generated per match.
- Fixed spawn positions per side.

### Combat Triangle

```
Magical > Brute > Hunter > Magical
```

Type advantage gives +50% damage, disadvantage gives -50%. Derived from Death Mountain's combat rules.

### Damage Formula

**Base damage**: `Level × (6 - Tier)` via Death Mountain formula. Minimum 2.

---

## Subclasses

Each beast type has two subclasses with distinct roles, ranges, and passives:

### Magical

| Subclass | Role | Move | Attack Range | Passive |
|----------|------|:----:|:------------:|---------|
| **Warlock** | Glass Cannon | 2 | 3 | **Siphon** — heals 15% of damage dealt |
| **Enchanter** | Support | 2 | 2 | **Regen** — starts with +8% max HP |

### Hunter

| Subclass | Role | Move | Attack Range | Passive |
|----------|------|:----:|:------------:|---------|
| **Stalker** | Assassin | 3 | 1 (melee) | **First Strike** — +15% damage vs targets at full HP |
| **Ranger** | Sniper | 2 | 4 | **Exposed** — takes +30% damage from adjacent enemies |

### Brute

| Subclass | Role | Move | Attack Range | Passive |
|----------|------|:----:|:------------:|---------|
| **Juggernaut** | Tank | 2 | 1 (melee) | **Fortify** — -10% damage received if didn't move last turn |
| **Berserker** | Bruiser | 2 | 1 (melee) | **Rage** — +12% damage when below 50% HP |

**Key tactical notes:**
- Stalker is the only subclass with 3 movement — the assassin that closes gaps fast.
- Ranger has 4 attack range but is vulnerable up close (Exposed passive is a drawback).
- Warlock sustains through Siphon but has low HP.
- Juggernaut rewards positioning and holding ground.
- Berserker gets stronger as it takes damage — risky to leave alive at low HP.
- Enchanter's Regen is applied at creation, giving a flat HP advantage from the start.

---

## Team Restrictions & Game Settings

### Default Rules

- Only T2, T3, T4 beasts allowed (T1 legendaries and T5 commons excluded).
- Max 1 T2 beast per team.
- Max 2 T3 beasts per team.
- T4 has no additional limit.
- Team size: 3 beasts.

### Custom Settings (Friendly Games)

When playing with friends, you can create custom game settings that modify:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `min_tier` / `max_tier` | Allowed beast tier range | T2–T4 |
| `max_t2_per_team` | Max T2 beasts per player | 1 |
| `max_t3_per_team` | Max T3 beasts per player | 2 |
| `beasts_per_player` | Team size | 3 |

Custom settings are created onchain and assigned a `settings_id`. Any player can create a friendly game using an existing settings profile, enabling different formats: all-T4 drafts, larger teams, tier-restricted tournaments, etc.

---

## EGS Integration (Budokan Tournaments)

Tactical Beasts implements the [Embeddable Game Standard](https://github.com/Provable-Games/game-components) for full compatibility with Budokan, the onchain tournament framework:

- **NFT per session**: each player receives an ERC721 token when a match starts (minted via EGS).
- **`score(token_id)`**: returns cumulative score across ranked matches. Formula: `(wins × 500) + (kills × 50) + (beasts_alive × 30)`.
- **`game_over(token_id)`**: returns true when the match is finished or tournament time expires.
- **`settings_exist(settings_id)`**: validates game settings for tournament configuration.
- Friendly games are excluded from EGS scoring and profile stats.

This means Tactical Beasts matches can be part of Budokan tournaments with automated leaderboards and prize distribution.

---

## Ecosystem Integrations

| Integration | What | Where |
|---|---|---|
| **Death Mountain** | Damage formula, type triangle, ±50% advantage | `contracts/src/logic/combat.cairo` |
| **Loot Survivor Beasts** | 75 species (3 types × 5 tiers), NFT ownership | Summit API + `beasts-all.json` |
| **EGS (game-components)** | `IMinigameTokenData`, `IMinigameSettings`, session NFTs | `contracts/src/systems/game_system.cairo` |
| **Summit API** | Fetch player's owned beast NFTs | `src/hooks/useOwnedBeasts.ts` |
| **Cartridge Controller** | Wallet auth, session keys | `src/dojo/controller/` |
| **Denshokan SDK** | Ecosystem features | `package.json` |
| **Supabase** | Friends, game invites, realtime | `src/services/supabase.ts` |

---

## Quick Start

```bash
# Install
npm install --legacy-peer-deps

# Local development (requires Dojo toolchain)
make katana    # Start local Starknet node
make setup     # Build, migrate, generate bindings, start Torii
make dev       # Start frontend dev server

# Sepolia
make dev-sepolia

# Mainnet
make dev-mainnet
```

## Stack

Dojo 1.8.x · Cairo 2.15.x · React · Chakra UI · Starknet.js · Cartridge Controller · Torii · Supabase
