# Integración EGS — Tactical Beasts

Este documento describe cómo Tactical Beasts integra el **Embeddable Game Standard (EGS)** del ecosistema `cartridge-gg/arcade`, siguiendo el mismo patrón que **Nums**.

## Resumen

Tactical Beasts es un juego PvP por turnos. Cada partida involucra 2 jugadores, cada uno comandando 3 bestias en una grilla hexagonal. La integración EGS agrega:

- **Collection (ERC721)** — Cada jugador recibe un NFT al crear o unirse a una partida
- **Leaderboard (RankableComponent)** — Los scores de los ganadores se envían a un leaderboard global
- **Achievements (AchievableComponent)** — Tracking de trofeos por hitos (victorias, victorias perfectas)
- **IMinigameTokenData** — Interfaz estándar (`score` + `game_over`)

### Sobre Budokan

La integración actual usa `cartridge-gg/arcade` — el mismo approach que Nums. Esto **no** es lo mismo que `Provable-Games/tournaments` (el repo que Budokan consume directamente con `game_component`, `IGameDetails`, `ISettings`). Nums tampoco implementa `Provable-Games/tournaments`.

Para compatibilidad directa con torneos Budokan se necesitaría agregar el `game_component` de `Provable-Games/tournaments` en una futura iteración. Eso aplica tanto para Tactical Beasts como para Nums.

## Arquitectura

### 2 NFTs por partida

A diferencia de juegos EGS single-player (ej. Nums), Tactical Beasts es PvP y mintea **2 tokens por partida** — uno por jugador. Esto es necesario porque:

1. El **leaderboard de arcade** usa `key = game_id` (el token_id) para deduplicación — un solo token_id solo permitiría una entrada de score por partida
2. Cada token mapea a `(match_id, player)` vía el modelo `GameToken`, así `score(token_id)` puede resolver quién ganó y devolver el score apropiado
3. En un futuro modo torneo, cada jugador necesitaría su propio `token_id` para enviar scores independientemente

### Flujo de tokens

```
Player 1 llama create_game()
  → Collection.mint(player1) → token_id = 1
  → GameToken { token_id: 1, match_id: 1, player: player1 }
  → GameTokens { match_id: 1, p1_token_id: 1, p2_token_id: 0 }

Player 2 llama join_game(1)
  → Collection.mint(player2) → token_id = 2
  → GameToken { token_id: 2, match_id: 1, player: player2 }
  → GameTokens { match_id: 1, p1_token_id: 1, p2_token_id: 2 }
```

### Fórmula de score

```
score = (MAX_ROUNDS - rondas_usadas) * 10 + WIN_BONUS
```

- `MAX_ROUNDS = 50`, `WIN_BONUS = 100`
- En ronda 1: score = 490 + 100 = 590
- En ronda 50: score = 0 + 100 = 100
- El perdedor siempre obtiene score = 0

Esto premia victorias eficientes — menos rondas = mayor score.

## Componentes

### 1. Contrato Collection (`systems/collection.cairo`)

Un `#[dojo::contract]` que implementa ERC721 con extensiones. Este es el componente central de la integración EGS — viene del package `collection` de `cartridge-gg/arcade` y provee:

- **ERC721** (OpenZeppelin 2.0.0) — Funcionalidad NFT estándar. Cada partida es un token.
- **ERC4906** — Eventos de actualización de metadata (disparados al terminar la partida via `update()` → `erc4906.update_metadata`)
- **ERC7572** — Metadata a nivel de contrato para display en marketplaces
- **AccessControl** — MINTER_ROLE otorgado a game_system vía DNS lookup en `dojo_init`
- **Soporte soulbound** — Los tokens pueden ser opcionalmente no-transferibles

`token_uri` devuelve JSON con metadata dinámica de la partida (lee el estado del juego on-chain):
```json
{
  "name": "Tactical Beasts Match",
  "description": "A Tactical Beasts game session",
  "match_id": "1",
  "status": "finished",
  "winner": "true"
}
```

### 2. Integración en Game System (`systems/game_system.cairo`)

El contrato principal del juego embebe dos componentes de arcade:

```cairo
component!(path: RankableComponent, storage: rankable, event: RankableEvent);
component!(path: AchievableComponent, storage: achievable, event: AchievableEvent);
```

**Inicialización (`dojo_init`):**
- Configura capacidad del leaderboard a top 100
- Registra 3 achievements (FirstBlood, Veteran, Flawless)

**Al crear/unirse a partida:**
- Mintea NFT vía Collection dispatcher (`collection.mint(caller, false)`)
- Crea mapeo `GameToken` (token_id → match_id + player)
- Actualiza tracking `GameTokens` (match_id → p1_token_id + p2_token_id)

**Al terminar la partida (en el bloque de victoria de `execute_turn`):**
1. Calcula score con la fórmula de arriba
2. Envía al leaderboard: `self.rankable.submit(world, LEADERBOARD_ID, winner_token_id, player_id, score, time, true)`
3. Actualiza metadata de collection: `collection.update(winner_token_id)` (dispara evento ERC4906)
4. Progresa el achievement task WINNER
5. Si las 3 bestias del ganador están vivas → progresa el achievement task FLAWLESS

### 3. IMinigameTokenData

```cairo
fn score(token_id: u64) -> u64 {
    // Busca GameToken → Game
    // Devuelve score calculado si el player de este token ganó, 0 en caso contrario
}

fn game_over(token_id: u64) -> bool {
    // Devuelve true si el estado del juego == FINISHED
}
```

Ambas funciones reciben un `token_id` (no `game_id`), permitiendo consultar el resultado por jugador.

### 4. Achievements (`elements/achievements.cairo`)

| Achievement | Task | Cantidad | Descripción |
|------------|------|----------|-------------|
| FirstBlood | WINNER | 1 | Ganá tu primera partida |
| Veteran | WINNER | 10 | Ganá 10 partidas |
| Flawless | FLAWLESS | 1 | Ganá sin perder ninguna bestia |

Los achievements siguen el patrón `AchievableTrait` de arcade. Cada uno define:
- `identifier()` — ID único felt252
- `tasks()` — Array de pares `(task_id, cantidad_para_completar)`
- `metadata()` — Datos de display (título, descripción, ícono, puntos)

## Modelos

| Modelo | Key | Campos | Propósito |
|--------|-----|--------|-----------|
| `GameToken` | `token_id: u64` | `match_id, player` | Mapea token NFT a partida y dueño |
| `GameTokens` | `match_id: u32` | `p1_token_id, p2_token_id` | Trackea ambos tokens de una partida |
| `GameConfig` | `id: felt252` | `game_count, token_count` | Contadores globales |

## Deploy

En `dojo_dev.toml`:

```toml
[migration]
order_inits = ["TB-game_system", "TB-Collection"]
```

**El orden importa:** `game_system` debe inicializarse primero para que su address exista en DNS cuando `Collection.dojo_init` otorga el MINTER_ROLE.

## Dependencias

En `Scarb.toml`:

```toml
leaderboard = { git = "https://github.com/cartridge-gg/arcade", rev = "1c66ba7" }
collection = { git = "https://github.com/cartridge-gg/arcade", rev = "1c66ba7" }
achievement = { git = "https://github.com/cartridge-gg/arcade", rev = "1c66ba7" }
openzeppelin = "2.0.0"
graffiti = { git = "https://github.com/bal7hazar/graffiti.git", rev = "e8b0854" }
```

**Nota sobre OpenZeppelin:** Se debe pinear `openzeppelin_utils = 2.0.0` en `Scarb.lock`. Si el resolver de Scarb toma la versión 2.1.0, rompe `openzeppelin_token-2.0.0` porque `openzeppelin_utils::cryptography::interface` fue removido en 2.1.0. Nums no tiene este problema porque su lock file fue generado cuando 2.1.0 no existía.

Contratos externos buildeados para indexing por Torii:
- Modelos de achievement (4) y eventos (4)
- Evento de score del leaderboard

## Relación con Budokan y `Provable-Games/tournaments`

### Lo que tenemos (arcade)

La integración con `cartridge-gg/arcade` provee:
- NFTs ERC721 por partida con metadata dinámica
- Leaderboard propio del juego (top 100)
- Sistema de achievements con tracking de progreso
- Interfaz `IMinigameTokenData` (score + game_over) consultable por cualquier contrato

Esto es exactamente lo que Nums implementa. El `collection` package de arcade es la capa EGS en este ecosistema.

### Lo que NO tenemos (tournaments)

Para integración directa con **torneos Budokan** se necesitaría:
- `game_component` de `Provable-Games/tournaments` (v1.5.0)
- `IGameDetails::score(game_id) -> u32`
- `ISettings::setting_exists(settings_id) -> bool`
- Lifecycle checks (`assert_is_playable`)
- Que Budokan controle el mint de tokens (via `game_component.mint()`)

**Ni Nums ni Tactical Beasts implementan esto actualmente.** Es un paso futuro si se quiere participar directamente en torneos Budokan.

## Tests

Tests end-to-end de EGS en `tests/test_game.cairo`:

- `test_create_mints_nft` — Verifica minteo de NFT al crear partida
- `test_join_mints_nft` — Verifica minteo de NFT al unirse a partida
- `test_egs_in_progress` — `game_over` devuelve false, `score` devuelve 0 antes de terminar
- `test_finish_submits_score` — Juega partida hasta victoria, verifica score ganador = 590, score perdedor = 0
- `test_game_over_token` — Ambos tokens de jugador devuelven `game_over = true` después de que termina la partida
- `test_multiple_games` — Cada partida mintea tokens separados con IDs secuenciales

Los tests usan `ModelStorageTest::write_model_test()` para setear estados de bestias directamente y crear escenarios de victoria determinísticos.

## Implementación de referencia

Esta integración sigue el patrón establecido por **Nums** (`nums/contracts/`) que usa el mismo stack (Dojo 1.8.0, Cairo 2.13.1) y los mismos packages de `cartridge-gg/arcade`. Diferencias clave:

| Aspecto | Nums (single-player) | Tactical Beasts (PvP) |
|---------|----------------------|----------------------|
| Tokens por partida | 1 | 2 (uno por jugador) |
| Fuente del score | Específica del juego (secuencia numérica) | Compuesto (rondas + bonus victoria) |
| Score del perdedor | N/A | 0 |
| Achievements | Grinder, Daily, Socializer | FirstBlood, Veteran, Flawless |
| Quests | Implementado (QuestableComponent) | No implementado (futuro) |
| Starterpacks | Implementado (StarterpackComponent) | No implementado (futuro) |
| Budokan (tournaments) | No implementado | No implementado |
