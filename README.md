# Tactical Beasts

PvP 1v1 turn-based tactical game on Starknet. Build a team of 3 beast NFTs from the [Loot Survivor](https://lootsurvivor.io) ecosystem and battle on a hex grid with obstacles, strategic positioning, and subclass abilities.

Part of the [Provable Games](https://docs.provable.games/) ecosystem — beasts, combat formulas, and tournament integration come from shared onchain infrastructure. All game logic runs fully onchain via Dojo.

> **Sepolia demo**: everything functional except mainnet beast fetching — uses predefined test beasts. Create game configurations via EGS, play 1v1 with friends, and explore custom settings.

---

**[Demo Video](https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1)** | **[Sepolia Demo](https://tactical-beasts-sepolia.vercel.app/)** | **[Mainnet Demo](https://tactical-beasts.vercel.app/)**

---

## Table of Contents

- [Objective](#objective)
- [How It Fits in the Ecosystem](#how-it-fits-in-the-ecosystem)
- [Where Do Beasts Come From?](#where-do-beasts-come-from)
- [Gameplay Flow](#gameplay-flow)
- [The Board](#the-board)
- [Combat Triangle](#combat-triangle)
- [Damage Formula](#damage-formula)
- [Counter-Attack](#counter-attack)
- [Beast Types & Subclasses](#beast-types--subclasses)
- [Team Restrictions & Game Settings](#team-restrictions--game-settings)
- [Matchmaking & Ranking](#matchmaking--ranking)
- [Friendly Games](#friendly-games)
- [EGS Integration (Budokan Tournaments)](#egs-integration-budokan-tournaments)
- [Denshokan](#denshokan)
- [Ecosystem Integrations](#ecosystem-integrations)
- [Quick Start (Local)](#quick-start-local)
- [Sepolia Demo](#sepolia-demo)
- [Stack](#stack)

---

## Objective

Eliminate all 3 of your opponent's beasts. Each match is a 1v1 on a hex grid where positioning, type advantages, and subclass abilities determine the outcome. Win matches in ranked matchmaking to climb the leaderboard — the scoring system works like a league, powered by the Embeddable Game Standard (EGS).

---

## How It Fits in the Ecosystem

Tactical Beasts is the tactical combat layer of the Provable Games ecosystem:

```
Loot Survivor (play) --> Earn beasts & tokens
         |
         v
    Beast NFTs (ERC721 on Starknet mainnet)
         |
    +----+----+
    |         |
    v         v
 Summit    Tactical Beasts (this game)
 (PvP)    (grid tactics)
    |         |
    +----+----+
         |
         v
    Budokan Tournaments (via EGS)
```

- **Loot Survivor / Death Mountain**: defines the 75 beast species, 3 types, 5 tiers, the combat triangle, and the damage formula. Tactical Beasts inherits all of this.
- **Beast NFTs**: players use the actual ERC721 beasts they own on Starknet. Ownership is validated both in contracts and frontend.
- **Summit**: the king-of-the-hill game that shares the same beasts. Upgrade beasts there, battle them here.
- **Budokan**: Tactical Beasts implements EGS, so it's tournament-ready. Ranked matches generate scores for automated leaderboards and prize distribution.

---

## Where Do Beasts Come From?

Beasts are **ERC721 NFTs** minted through Loot Survivor gameplay on Starknet. Each beast has a species (1-75), type (Magical/Hunter/Brute), tier (T1-T5), level, and health — all packed onchain.

- **On mainnet**: the game reads your actual owned beast NFTs from the Beasts contract (`0x046da8...`). Nobody can play with a beast they don't own — validated onchain.
- **On Sepolia/local**: we have 2 predefined beasts per species (150 total) for testing. These let anyone try the game without needing mainnet NFTs.
- **Default beasts**: players who don't own any NFTs can still try the game using a set of default T4 beasts, so nobody is locked out.

You can view your token IDs in the game UI.

---

## Gameplay Flow

### 1. Find a Match

Two options:
- **Matchmaking**: enter the queue and get paired with another player. Ranked matches count toward the leaderboard.
- **Invite a Friend**: search by Controller name, add as friend, and send a game invite. These matches do NOT count for ranking.

### 2. Select Team (30 seconds)

- You have **30 seconds** to pick your 3 beasts from your collection.
- **Auto-confirm**: if time runs out, the game auto-selects default beasts or completes your team with defaults.
- The game **remembers your last selection** for better UX — next time you queue, your previous 3 beasts are pre-selected.

### 3. Coin Flip

A coin flip determines who goes first. Calculated as `(timestamp + game_id) % 2 + 1` — pseudo-random but deterministic and verifiable onchain.

### 4. Battle (Turn-Based)

Each turn:
1. The active player **plans actions for ALL their beasts** (up to one action per beast: move, attack, or skip).
2. Once confirmed, **all actions execute together**.
3. Then the other player takes their turn.

This is NOT alternating single-beast actions — it's **all your beasts act, then all theirs act**. You can choose to do nothing with some beasts. Not every action is mandatory.

### 5. Victory

The match ends when all 3 beasts on one side are eliminated. Stats, kills, and score are recorded onchain.

---

## The Board

- Hex grid with 7 rows: `[6, 7, 8, 7, 8, 7, 6]` = 49 cells.
- **6 obstacles** randomly generated per match.
- Fixed spawn positions: Player 1 on the left, Player 2 on the right.
- Movement uses hex distance (offset-to-cube conversion) — no cheating diagonals.

---

## Combat Triangle

Inherited from Death Mountain / Loot Survivor:

```
     Magical
    /       \
   /  strong  \
  v            |
Brute -------> Hunter
      strong
```

- **Magical > Brute**: +50% damage
- **Brute > Hunter**: +50% damage
- **Hunter > Magical**: +50% damage
- Reverse matchups: -50% damage
- Same type: neutral

This is the same weapon triangle from Loot Survivor (Magic/Cloth > Bludgeon/Metal > Blade/Hide > Magic/Cloth) applied to beast types.

---

## Damage Formula

Uses the Death Mountain combat formula:

```
Base Damage = Level x (6 - Tier)
```

| Tier | Multiplier | Example (Level 10) |
|------|:----------:|:-------------------:|
| T1   | x5         | 50 damage           |
| T2   | x4         | 40 damage           |
| T3   | x3         | 30 damage           |
| T4   | x2         | 20 damage           |
| T5   | x1         | 10 damage           |

**Modifiers applied in order:**
1. **Type advantage**: x1.5 (strong) or x0.5 (weak)
2. **Consumable potion**: x1.1 (one per player per game)
3. **Critical hit**: x2 (chance based on luck stat, capped at 95%)
4. **Subclass passives** (see below)
5. **Minimum damage**: always at least 2

---

## Counter-Attack

When you attack an enemy beast and it **survives**, it automatically counter-attacks. The counter deals **20% of its normal attack damage** back to your beast. This counter can kill your attacker.

Counter-attacks use the same damage formula (including type advantages) but at 20% power and without potion bonus.

---

## Beast Types & Subclasses

Each of the 3 beast types (Magical, Hunter, Brute) has **2 subclasses** with unique roles, movement ranges, attack ranges, and passive abilities:

### Magical (Beast IDs 1-25)

Low HP, high damage. Ranged attackers.

| Subclass | Role | Move | Attack Range | Passive |
|----------|------|:----:|:------------:|---------|
| **Warlock** | Glass Cannon | 2 | 3 | **Siphon** — heals 15% of damage dealt |
| **Enchanter** | Support | 2 | 2 | **Regen** — starts with +8% max HP |

### Hunter (Beast IDs 26-50)

Medium stats. Mix of melee assassins and long-range snipers.

| Subclass | Role | Move | Attack Range | Passive |
|----------|------|:----:|:------------:|---------|
| **Stalker** | Assassin | 3 | 1 (melee) | **First Strike** — +15% damage vs targets at full HP |
| **Ranger** | Sniper | 2 | 4 | **Exposed** — takes +30% damage from adjacent enemies |

### Brute (Beast IDs 51-75)

High HP, melee fighters. Tanks and brawlers.

| Subclass | Role | Move | Attack Range | Passive |
|----------|------|:----:|:------------:|---------|
| **Juggernaut** | Tank | 2 | 1 (melee) | **Fortify** — -10% damage received if didn't move last turn |
| **Berserker** | Bruiser | 2 | 1 (melee) | **Rage** — +12% damage when below 50% HP |

### Passive Abilities Explained

| Passive | Subclass | Effect | When |
|---------|----------|--------|------|
| **Siphon** | Warlock | Heals 15% of damage dealt | On attack |
| **Regen** | Enchanter | +8% bonus HP | At beast creation (permanent) |
| **First Strike** | Stalker | +15% bonus damage | When target is at 100% HP |
| **Exposed** | Ranger | Takes +30% extra damage | When enemy is adjacent (1 hex away) — this is a drawback |
| **Fortify** | Juggernaut | -10% damage received | If the Juggernaut didn't move on its last turn |
| **Rage** | Berserker | +12% bonus damage | When below 50% HP |

### Tactical Notes

- **Stalker** is the only subclass with 3 movement — the assassin that closes gaps fast and punishes fresh targets.
- **Ranger** has the longest attack range (4) but Exposed makes it a glass cannon at close range. Keep distance.
- **Warlock** sustains through Siphon but has low HP — hit hard and heal back.
- **Juggernaut** rewards holding ground. Move into position and stay put for the damage reduction.
- **Berserker** gets stronger as it takes damage — dangerous to leave alive at low HP.
- **Enchanter** has a flat HP advantage from the start thanks to Regen, making it the most durable magical beast.

---

## Team Restrictions & Game Settings

### Default Rules (Ranked)

| Rule | Value | Reason |
|------|-------|--------|
| Allowed tiers | T2, T3, T4 | T1 legendaries and T5 commons excluded for balance |
| Max T2 per team | 1 | Prevents stacking rare beasts |
| Max T3 per team | 2 | Balanced composition |
| T4 limit | None | Freely available |
| Team size | 3 beasts | - |

### Custom Settings (Friendly Games)

When playing with friends, create custom configurations that modify:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `min_tier` / `max_tier` | Allowed beast tier range | T2-T4 |
| `max_t2_per_team` | Max T2 beasts per player | 1 |
| `max_t3_per_team` | Max T3 beasts per player | 2 |
| `beasts_per_player` | Team size | 3 |

Custom settings are stored onchain with a `settings_id`. You can create and reuse them. Coming soon: create Budokan **tournaments** with these custom configurations, powered by EGS.

---

## Matchmaking & Ranking

### Matchmaking

Simple queue-based system. Enter the queue, get matched with the next available opponent. Fully onchain resolution.

### Ranking Formula

Ranked matchmaking matches contribute to a league-style leaderboard. The score formula:

```
Score = (wins x 500) + (kills x 50) + (beasts_alive x 30)
```

| Component | Points | Rewards |
|-----------|:------:|---------|
| Win | 500 | Winning the match |
| Kill | 50 | Each enemy beast eliminated |
| Beast alive | 30 | Each of your beasts surviving |

This creates a league ranking where consistency matters — both winning and winning efficiently (more kills, fewer losses) are rewarded.

**Tracked stats per player**: games played, wins, losses, total kills, total deaths, abandons.

---

## Friendly Games

Play with friends without affecting your ranking:

1. **Add friends**: search by Controller name and send a friend request.
2. **Invite to game**: once accepted, send a game invite.
3. **Custom rules**: optionally use a custom `GameSettings` configuration (different tiers, team sizes, caps).
4. **No ranking impact**: friendly matches are excluded from EGS scoring and profile stats.

Realtime notifications for friend requests and game invites via Supabase subscriptions.

---

## EGS Integration (Budokan Tournaments)

Tactical Beasts implements the [Embeddable Game Standard](https://github.com/Provable-Games/game-components) (`IMinigameTokenData` + `IMinigameSettings`), making it fully compatible with [Budokan](https://docs.provable.games/budokan), the onchain tournament framework.

### How It Works

- **NFT per session**: each player receives an ERC721 token when a match starts (minted via EGS `minigame.mint()`).
- **`game_over(token_id)`**: returns `true` when the match is finished.
- **`settings_exist(settings_id)`**: validates game settings for tournament configuration.

### `score(token_id)` — Adapting EGS for PvP

Budokan and EGS were originally designed for **PvE** games (like Loot Survivor), where a single player plays and gets a score at the end of their session. In those games, `score(token_id)` simply returns the score from that individual match.

**The PvP challenge**: in a 1v1 game, a single match doesn't capture a player's performance well enough. A per-match score doesn't work for a competitive system — you need a cumulative metric.

**Our solution**: each token accumulates league-style stats (KD — kills and deaths) across multiple ranked matches. `score(token_id)` returns a **cumulative score** based on the token's historical performance:

```
score = (wins x 500) + (kills x 50) + (beasts_alive x 30)
```

The `TokenScore` model tracks per token: `wins`, `losses`, `kills`, `deaths`, `beasts_alive`, `matches_played`. This turns Tactical Beasts into a **league** system where the score reflects sustained performance, not a single match.

**In short**: we adapted EGS (designed for PvE) to a PvP game by making the token work as a "season pass" that accumulates KD.

### What This Enables

- Automated Budokan tournaments with Tactical Beasts matches.
- Prize distribution based on onchain leaderboard scores.
- Custom tournament formats using different `GameSettings`.
- **We're tournament-ready** — any Budokan organizer can create a Tactical Beasts tournament today.

Friendly games are excluded from EGS scoring.

---

## Denshokan

- Token minting and metadata management.
- Score submissions to the rankable leaderboard.
- ERC4906 metadata updates on game events.
- **[View minted Token IDs](https://funfactory.gg/games?network=sepolia)**

---

## Ecosystem Integrations

| Integration | What | Where |
|---|---|---|
| **Death Mountain** | Damage formula (`Level x (6-Tier)`), combat triangle (+-50%), minimum damage | `contracts/src/logic/combat.cairo` |
| **Loot Survivor Beasts** | 75 species across 3 types x 5 tiers, ERC721 NFT ownership validation | Summit API + `beasts-all.json` |
| **EGS (game-components)** | `IMinigameTokenData`, `IMinigameSettings`, session NFTs, score/game_over | `contracts/src/systems/game_system.cairo` |
| **Budokan** | Tournament-ready via EGS integration | Leaderboard + score submission |
| **Summit API** | Fetch player's owned beast NFTs for team selection | `src/hooks/useOwnedBeasts.ts` |
| **Cartridge Controller** | Wallet auth, session keys (used on Sepolia/mainnet; burners locally) | `src/dojo/controller/` |
| **Denshokan SDK** | Token minting, score tracking, metadata | `src/config/denshokan.ts` |
| **Supabase** | Friends system, game invites, realtime notifications | `src/services/supabase.ts` |

---

## The 75 Beasts

All beasts come from Loot Survivor. Tier determines base power, type determines combat advantage:

### Magical (IDs 1-25)

| Tier | Beasts |
|------|--------|
| T1 | Warlock, Typhon, Jiangshi, Anansi, Basilisk |
| T2 | Gorgon, Kitsune, Lich, Chimera, Wendigo |
| T3 | Rakshasa, Werewolf, Banshee, Draugr, Vampire |
| T4 | Goblin, Ghoul, Wraith, Sprite, Kappa |
| T5 | Fairy, Leprechaun, Kelpie, Pixie, Gnome |

### Hunter (IDs 26-50)

| Tier | Beasts |
|------|--------|
| T1 | Griffin, Manticore, Phoenix, Dragon, Minotaur |
| T2 | Qilin, Ammit, Nue, Skinwalker, Chupacabra |
| T3 | Weretiger, Wyvern, Roc, Harpy, Pegasus |
| T4 | Hippogriff, Fenrir, Jaguar, Satori, DireWolf |
| T5 | Bear, Wolf, Mantis, Spider, Rat |

### Brute (IDs 51-75)

| Tier | Beasts |
|------|--------|
| T1 | Kraken, Colossus, Balrog, Leviathan, Tarrasque |
| T2 | Titan, Nephilim, Behemoth, Hydra, Juggernaut |
| T3 | Oni, Jotunn, Ettin, Cyclops, Giant |
| T4 | NemeanLion, Berserker, Yeti, Golem, Ent |
| T5 | Troll, Bigfoot, Ogre, Orc, Skeleton |

> Remember: T1 and T5 are **excluded** from Tactical Beasts for balance. Only T2-T4 beasts are playable.

---

## Quick Start (Local)

Local development uses prefunded burner wallets — no Controller needed.

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start local Starknet node
make katana

# Build contracts, migrate, generate bindings, start Torii indexer
make setup

# Start frontend dev server
make dev
```

### Sepolia

```bash
make dev-sepolia
```

Uses Cartridge Controller for wallet auth. Predefined test beasts (2 per species) instead of mainnet NFTs.

### Mainnet

```bash
make dev-mainnet
```

Full experience: reads your actual beast NFTs from Starknet mainnet. Controller for auth.

---

## Sepolia Demo

The Sepolia deployment has everything working:

- Matchmaking queue and ranked play.
- Friend system with Controller name search.
- Custom game configurations via EGS.
- Team selection with tier validation.
- Full battle flow with hex grid, passives, counter-attacks, and crits.
- Leaderboard with league-style scoring.
- View token IDs for all players.

**Not yet on Sepolia**: fetching beast NFTs from mainnet. Uses the predefined 150 test beasts (2 per species) instead.

---

## Stack

Dojo 1.8.x · Cairo 2.15.x · React 18 · Chakra UI · Starknet.js · Cartridge Controller · Torii · Supabase · Denshokan SDK
