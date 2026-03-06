# Tactical Beats
## Especificacion MVP (1 semana)

Version: 1.0  
Fecha: 27 Febrero 2026  
Objetivo: entregar una version jugable de Tactical Beats en 7 dias, con combate tactico por turnos y bestias NFT de Loot Survivor.

---

## 0. Proyectos de referencia en el monorepo

Los siguientes proyectos del monorepo son recursos directos para la implementacion:

### `beasts/` — Contrato NFT de bestias
Contrato ERC721 desplegado en Starknet mainnet. Define las 75 especies de bestias usadas en el ecosistema.

**Datos clave para Tactical Beats:**
- **PackableBeast**: struct empaquetado en 53 bits (id, prefix, suffix, level, health, shiny, animated)
- **Tipos** (determinados por rango de ID):
  - Magic (IDs 1-25), Hunter (IDs 26-50), Brute (IDs 51-75)
- **Tiers** (5 por tipo, determinados por sub-rango):
  - T1 Legendary (IDs 1-5, 26-30, 51-55) ... T5 Common (IDs 21-25, 46-50, 71-75)
- **Power** = `level × (6 - tier)` — misma formula que Death Mountain
- **Sin stats individuales**: no hay STR, DEX, etc. El poder viene solo de id→tipo+tier + level
- **Funciones utiles**: `get_type(id)`, `get_tier(id)`, `get_beast_name(id)`, `get_beast_attributes(beast)`

**Archivos clave:**
- `beasts/src/beast_definitions.cairo` — 75 bestias, tipos, tiers, nombres, lookups
- `beasts/src/pack.cairo` — PackableBeast + packing/unpacking
- `beasts/src/interfaces.cairo` — IBeasts, IBeastSystems
- `beasts/src/beast_manager.cairo` — BeastManager trait, get_beast_attributes

### `docs-provable-games/` — Documentacion de formulas y reglas
Documentacion completa del ecosistema Provable Games.

**Archivos clave para Tactical Beats:**
- `docs-provable-games/loot-survivor/combat.md` — Pipeline de dano completo (5 pasos)
- `docs-provable-games/loot-survivor/beasts.md` — Lista de bestias, tiers, tipos
- `docs-provable-games/loot-survivor/stats.md` — Formulas de stats (STR, LUCK, etc.)
- `docs-provable-games/summit/battle-system.md` — Combate entre bestias, upgrades
- `docs-provable-games/summit/consumables.md` — Pociones (revival, attack, extra life)
- `docs-provable-games/embeddable-game-standard/implementation.md` — Guia paso a paso EGS
- `docs-provable-games/embeddable-game-standard/key-functions.md` — API reference EGS
- `docs-provable-games/budokan/key-functions.md` — API de torneos

**Formulas de referencia:**
- Dano base: `Level × (6 - Tier)`
- Ventaja de tipo: ±50%
- Critico: `LUCK / 100` chance, x2 dano
- Triangulo: Brute > Hunter > Magical > Brute
- Dano minimo: 2 HP (bestias), 4 HP (aventureros)

### `nums/` — Referencia de implementacion EGS/Arcade
Juego puzzle onchain con integracion completa de `cartridge-gg/arcade`. Mismo stack que Tactical Beats (Dojo 1.8.0, Cairo 2.13.1).

**Patron de arquitectura (a seguir):**
- **3 sistemas Dojo**: Setup (inicializacion), Collection (ERC721 NFT), Play (logica de juego)
- **Componentes de arcade embebidos en Play**: AchievableComponent, QuestableComponent, RankableComponent, StarterpackComponent
- **Store trait**: capa de abstraccion sobre world storage (`store.cairo`)
- **Separacion clara**: models/ (estado), systems/ (contratos), components/ (logica stateless), elements/ (achievements/quests)

**Archivos clave:**
- `nums/contracts/Scarb.toml` — Dependencias de arcade (achievement, starterpack, leaderboard, collection, quest)
- `nums/contracts/src/systems/play.cairo` — Sistema principal con arcade integration
- `nums/contracts/src/systems/setup.cairo` — Inicializacion y registro de achievements/quests
- `nums/contracts/src/systems/collection.cairo` — ERC721 con ERC4906/ERC7572
- `nums/contracts/src/store.cairo` — Store trait pattern
- `nums/contracts/src/models/index.cairo` — Config, Game models
- `nums/Makefile` — Comandos de desarrollo (katana, build, migrate, torii)

---

## 1. Vision del juego

Tactical Beats es un juego tactico PvP por turnos estrictamente alternados en grilla hexagonal.
Cada jugador controla un equipo de bestias (NFTs).
El sistema de turnos es asimetrico: el jugador activo selecciona acciones (mover, atacar, usar pocion) y las ejecuta. El defensor no toma ninguna decision — su defensa se resuelve automaticamente segun las stats, posicion y tipo de sus bestias. Luego el turno pasa al otro jugador, que ahora es el atacante.

No hay fase simultanea ni espera de ambos jugadores. Cada turno es una sola transaccion del atacante; la defensa es determinista.

Ventajas para onchain:
- No requiere commit-reveal ni encriptar acciones
- Un solo jugador escribe por turno (una transaccion)
- La defensa se calcula con la posicion, tipo y stats de las bestias del defensor
- No hay ambiguedad sobre quien actua primero

Inspiracion de referencia:
- Tactical Monsters / Rumble Arena (estructura de combate tactico)
- Loot Survivor + Summit (formulas de dano, sistema de tipos, consumibles, extra lives)

---

## 2. Objetivo del MVP (Semana 1)

Entregar una version web jugable con:
- Seleccion de equipo desde dataset de bestias (`beasts-all.json`)
- Crear partida con Game ID + unirse con Game ID (sin matchmaking automatico)
- Arena hexagonal funcional con obstaculos basicos
- Turnos estrictamente alternados: atacante selecciona acciones -> ejecuta -> defensor responde automaticamente (sin input) -> cambio de turno
- Battle log con eventos de combate
- Victoria/derrota clara
- Reglas de combate alineadas a Loot/Summit
- PvP unicamente (sin bot)
- Integracion onchain completa que use Embeddable Game Standard como nums

Fuera de alcance en semana 1:
- Economia completa de pociones/market
- Sistema de progreso persistente
- Matchmaking automatico (cola de busqueda)
- Bot / IA rival

---

## 3. Reglas cerradas del MVP

### 3.0 Lobby (MVP)
- Modo soportado: `PvP 1v1`
- Flujo: `create game -> share gameId -> opponent joins -> both set teams -> battle`
- Jugador 1 (host):
  - Llama `create_game()` onchain, recibe `gameId` + se le mintea un NFT (EGS token)
  - Selecciona equipo de 3 bestias en el cliente
  - Llama `set_team(gameId, beast_1, beast_2, beast_3)` para registrar su equipo
  - Espera a que el rival se una y setee equipo
- Jugador 2 (guest):
  - Llama `join_game(gameId)` (sin beast IDs — se setean aparte) + se le mintea un NFT (EGS token)
  - Selecciona equipo de 3 bestias en el cliente
  - Llama `set_team(gameId, beast_1, beast_2, beast_3)` para registrar su equipo
  - Sin validacion de ownership en MVP (se confia en el cliente)
- Cuando ambos equipos estan seteados (`p1_team_set && p2_team_set`):
  - La partida arranca automaticamente (sin "ready check")
  - Se bloquea equipo para esa partida
  - Posiciones iniciales de bestias: fijas por jugador (P1: filas superiores, P2: filas inferiores)
  - Stats de todas las bestias se obtienen via funciones configurables (mismos stats para todas en MVP)
- Reconexion basica:
  - Si un cliente cae antes de completar el turno, puede reingresar por `gameId`
- Initiative: al inicio de la partida se determina pseudo-aleatoriamente que jugador ataca primero (`(timestamp + game_id) % 2 + 1`)

### 3.1 Composicion y setup
- Modo: 1v1
- Bestias por jugador: 3
- Arena: hex 6/7/8/7/8/7/6
- Obstaculos: 6 celdas bloqueadas fijas por mapa (plan futuro: multiples mapas con obstaculos random)
- Celdas especiales: no en v1 (placeholder visual permitido)
- Posiciones iniciales: fijas por jugador. P1: (0,1), (0,3), (1,5). P2: (6,1), (6,3), (5,1)
- Dos bestias no pueden ocupar la misma celda
- Restricciones de equipo: definidas via funcion `canTeamIncludeBeast()` (configurable, sin restricciones por defecto en MVP)
- Una bestia (tokenId) solo puede ser usada por un jugador por partida

### 3.2 Estructura de turno
El juego usa turnos estrictamente alternados (no simultaneos). Al inicio de la partida se sortea aleatoriamente quien ataca primero.

**Principio clave: el defensor nunca toma decisiones.** Solo el atacante tiene input. La defensa se resuelve automaticamente por el contrato/engine segun stats, posicion y tipo de las bestias del defensor.

Turno del jugador atacante:
1. **Seleccion de acciones**: el atacante define 1 accion por bestia activa:
   - `MOVE` — mover a otra celda (rango definido por `getMoveRange()`, configurable)
   - `ATTACK` — atacar a una bestia enemiga (rango definido por `getAttackRange()`, configurable)
   - `CONSUMABLE_ATTACK_POTION` — aplicar pocion (+10%) Y atacar en la misma accion (max 1 pocion por partida por jugador, compartida entre las 3 bestias)
   - `WAIT` — no hacer nada
2. **Ejecucion**: las acciones se resuelven en el orden que el atacante eligio (el orden del array de acciones define la secuencia). Si una accion previa mata a un objetivo, las acciones posteriores contra esa bestia fallan.
   - Si una bestia ataca: la bestia defensora contraataca automaticamente (sin input del defensor, ver 3.3).
3. **Cambio de turno**: el otro jugador pasa a ser el atacante.

Una ronda = 1 turno de cada jugador. Al finalizar la ronda, se evalua condicion de victoria.

**Implicacion onchain**: cada turno es una sola transaccion firmada por el atacante. El defensor no necesita estar conectado ni firmar nada durante el turno del oponente.

### 3.3 Sistema de combate

#### Formula base
`Power = Level * (6 - Tier)`

#### Modificadores
- Ventaja de tipo: +50%
- Desventaja de tipo: -50%
- Neutral: 0%
- Attack potion: +10% al siguiente ataque de esa bestia
- Critico: x2 dano total de ataque

#### Crit chance (decision MVP)
`CritChance = clamp(getLuck(beast), 0, 95)%`

- `getLuck(beast)` retorna 10 por defecto en MVP (funcion configurable para futuras iteraciones).
- Evita critico garantizado en v1.

#### Tipos
- Brute > Hunter
- Hunter > Magical
- Magical > Brute

Normalizacion de datos:
- Si viene `Magic`, mapear a `Magical` al cargar dataset.

#### Contraataque (automatico, sin input del defensor)
- Cuando una bestia ataca:
  1. Atacante golpea primero.
  2. Si la bestia defensora sobrevive, contraataca automaticamente (el jugador defensor no elige ni confirma nada).
  3. El intercambio termina al morir una unidad o completarse un ida-y-vuelta.
- El dano del contraataque se calcula via `getCounterDamage(defender, attacker)` (configurable, por defecto usa la misma formula de Power con type advantage).
- El defensor no puede elegir no contraatacar, ni cambiar de objetivo — siempre responde al atacante que lo golpeo.

### 3.4 Vida y extra lives
- `HP Max` inicial: valor del dataset.
- `ExtraLives` inicial: 1 (MVP).
- Cuando HP llega a 0:
  - Si `ExtraLives > 0`: consume 1 y vuelve a HP Max.
  - Si no: queda KO definitivo.

### 3.5 Condicion de victoria
Gana quien deje a todas las bestias enemigas en:
- `HP = 0`
- `ExtraLives = 0`

---

## 4. Modelo de datos minimo

## 4.1 Beast (runtime)
- tokenId: number
- name: string
- beast: string
- type: `Brute | Hunter | Magical`
- tier: 1..5
- level: number
- hp: number
- hpMax: number
- powerBase: number
- extraLives: number
- position: HexCoord
- alive: boolean

### Funciones configurables (valores por defecto en MVP)
- `getLuck(beast) -> number` — retorna 10 (crit chance)
- `getMoveRange(beast) -> number` — retorna rango de movimiento en hexes
- `getAttackRange(beast) -> number` — retorna rango de ataque en hexes
- `getCounterDamage(defender, attacker) -> number` — calcula dano de contraataque
- `canTeamIncludeBeast(team, beast) -> boolean` — restricciones de composicion de equipo

### 4.2 Action
- beast_index: number (0, 1 o 2)
- action_type: number (0=WAIT, 1=MOVE, 2=ATTACK, 3=CONSUMABLE_ATTACK_POTION)
- target_index: number (indice de bestia objetivo, 0 si no aplica)
- target_row: number (celda destino fila, 0 si no aplica)
- target_col: number (celda destino columna, 0 si no aplica)

### 4.3 BattleState
- round: number
- attacker: `PLAYER_1 | PLAYER_2` (quien tiene el turno de ataque)
- phase: `SELECTING_ACTIONS | RESOLVING | ENDED`
- arena: ArenaState
- players: PlayerState[2]
- actions: Action[] (acciones del atacante en el turno actual)
- log: BattleEvent[] (incluye ataques Y contraataques automaticos)
- winner?: playerId
- potionUsed: boolean[2] (1 pocion por jugador por partida)

---

## 5. Arquitectura MVP

### 5.1 Contratos (Cairo/Dojo)

Base: `tactical-beasts/contracts/` — proyecto Dojo existente (originalmente Rock Paper Scissors).

**Versiones (no cambiar):**
- Dojo: 1.8.0
- Cairo: 2.13.1
- Starknet: 2.13.1
- Namespace: se renombrara de `RPS` a `TB` (Tactical Beats)

**Makefile:** se mantiene el Makefile existente para desarrollo local (`make katana`, `make build`, `make migrate`, `make torii`, etc.).

**Decisiones de arquitectura:**
- **Todo onchain**: el contrato es la fuente de verdad. `execute_turn` recibe las acciones, calcula dano, contraataque, crits, extra lives, actualiza HP y verifica victoria. El cliente solo presenta.
- **Randomness**: pseudo-random (block timestamp/hash) para initiative y posiciones iniciales. VRF queda para futuro.
- **Coordenadas**: 0-based, todas positivas (`u8`). La grilla hex se mapea a coordenadas (row, col) sin negativos.
- **Score EGS**: `score()` retorna score compuesto `(MAX_ROUNDS - rondas) * 10 + WIN_BONUS`. Ganador > 0, perdedor = 0. Premia victorias rapidas.
- **Eventos**: GameCreated, PlayerJoined, GameFinished (basicos). Se expanden despues.
- **Orden de ejecucion**: el atacante elige el orden de sus bestias al enviar las acciones (el orden del array define la secuencia).
- **Tests**: unitarios para funciones clave (dano, type advantage, crit, extra lives, victoria). No tests innecesarios.

**Interfaz del contrato (game_system):**

```cairo
trait IGameSystem<T> {
    // Crea partida, retorna game_id. Mintea NFT (EGS token) para el creador.
    fn create_game(ref self: T) -> u32;

    // Se une a partida. Mintea NFT (EGS token) para el jugador 2.
    fn join_game(ref self: T, game_id: u32);

    // Registra equipo de 3 bestias. Ambos jugadores lo llaman por separado.
    // Cuando ambos setean equipo, la partida arranca automaticamente.
    fn set_team(ref self: T, game_id: u32, beast_1: u32, beast_2: u32, beast_3: u32);

    // Ejecuta turno: el atacante envia acciones ordenadas (el orden del array es el orden de ejecucion)
    fn execute_turn(ref self: T, game_id: u32, actions: Array<Action>);
}
```

**Tipo Action (onchain):**
```cairo
struct Action {
    beast_index: u8,         // indice de bestia del atacante (0, 1 o 2)
    action_type: u8,         // 0=WAIT, 1=MOVE, 2=ATTACK, 3=CONSUMABLE_ATTACK_POTION
    target_index: u8,        // para ATTACK/CONSUMABLE: indice de bestia objetivo (0 si no aplica)
    target_row: u8,          // para MOVE: celda destino (0 si no aplica)
    target_col: u8,          // para MOVE: celda destino (0 si no aplica)
}
```

**Stats de bestias (MVP):**
- Funcion `get_beast_stats(beast_id: u32) -> BeastStats` que retorna stats fijas para todas las bestias en MVP.
- Por el momento todas las bestias tienen los mismos stats (mismos valores de level, tier, hp, type).
- La funcion existe como punto de extension: en futuras versiones leera datos reales del contrato `beasts/` (ver seccion 0) usando `get_beast_attributes()` para obtener tipo, tier, level, health y power.

**Logica de combate (toda onchain en game_system):**
- `calculate_damage(attacker, defender) -> u16`: aplica Power formula + type advantage + potion + crit
- `get_type_advantage(attacker_type, defender_type) -> u8`: retorna ADVANTAGE/DISADVANTAGE/NEUTRAL
- `get_luck(beast_id) -> u8`: retorna 10 (configurable)
- `get_move_range(beast_id) -> u8`: retorna rango de movimiento (configurable)
- `get_attack_range(beast_id) -> u8`: retorna rango de ataque (configurable)
- `get_counter_damage(defender, attacker) -> u16`: calcula dano de contraataque (misma formula por defecto)
- `is_valid_move(game_id, beast_id, target_row, target_col) -> bool`: valida movimiento legal
- `is_valid_attack(game_id, attacker_id, target_id) -> bool`: valida ataque en rango
- `check_victory(game_id) -> ContractAddress`: verifica si hay ganador (todas las bestias KO + sin extra lives)

**Modelos Dojo:**

```cairo
#[dojo::model]
struct Game {
    #[key]
    game_id: u32,
    player1: ContractAddress,
    player2: ContractAddress,
    status: u8,           // WAITING=0, PLAYING=1, FINISHED=2
    current_attacker: u8, // 1 o 2
    round: u16,
    winner: ContractAddress,
    p1_team_set: bool,    // true cuando P1 llamo set_team
    p2_team_set: bool,    // true cuando P2 llamo set_team
}

#[dojo::model]
struct BeastState {
    #[key]
    game_id: u32,
    #[key]
    player_index: u8,     // 1 o 2
    #[key]
    beast_index: u8,      // 0, 1 o 2
    beast_id: u32,
    beast_type: u8,       // 0=Magical, 1=Hunter, 2=Brute
    tier: u8,             // 1-5
    level: u16,
    hp: u16,
    hp_max: u16,
    extra_lives: u8,
    position_row: u8,     // 0-based hex coord
    position_col: u8,     // 0-based hex coord
    alive: bool,
}

#[dojo::model]
struct PlayerState {
    #[key]
    game_id: u32,
    #[key]
    player: ContractAddress,
    player_index: u8,
    beast_1: u32,
    beast_2: u32,
    beast_3: u32,
    potion_used: bool,
}

#[dojo::model]
struct GameConfig {
    #[key]
    id: felt252,          // siempre 0 (singleton)
    game_count: u32,
    token_count: u64,     // contador global de NFTs minteados (EGS)
}

// --- Modelos EGS ---

#[dojo::model]
struct GameToken {
    #[key]
    token_id: u64,        // ID del NFT minteado
    match_id: u32,        // game_id de la partida
    player: ContractAddress, // jugador dueno del token
}

#[dojo::model]
struct GameTokens {
    #[key]
    match_id: u32,        // game_id de la partida
    p1_token_id: u64,     // token del jugador 1
    p2_token_id: u64,     // token del jugador 2
}
```

**Eventos Dojo:**
```cairo
#[dojo::event]
struct GameCreated {
    #[key]
    game_id: u32,
    player1: ContractAddress,
    time: u64,
}

#[dojo::event]
struct PlayerJoined {
    #[key]
    game_id: u32,
    player2: ContractAddress,
    time: u64,
}

#[dojo::event]
struct GameFinished {
    #[key]
    game_id: u32,
    winner: ContractAddress,
    rounds: u16,
    time: u64,
}
```

**IMinigameTokenData** (para EGS):
```cairo
fn score(self: @T, token_id: u64) -> u64;
// Score compuesto: (MAX_ROUNDS - rounds_used) * 10 + WIN_BONUS
// Ganador: score > 0 (ej: ronda 1 = 590, ronda 50 = 100)
// Perdedor: siempre 0
fn game_over(self: @T, token_id: u64) -> bool;  // status == FINISHED
// Nota: ambas funciones reciben token_id (no game_id).
// Cada jugador tiene su propio token_id que mapea a (match_id, player) via GameToken.
```

### 5.2 Frontend (React)

Estructura recomendada:
- `src/domain/` tipos y reglas
- `src/engine/` simulador puro de combate
- `src/data/` adaptadores (`beasts-all.json` -> runtime model)
- `src/ui/` pantallas y componentes
- `src/state/` estado global de partida

Principio clave:
- El motor (`engine`) no depende de React.
- UI solo consume estado/eventos del motor.

---

## 6. Flow de juego y pantallas

**Flujo onchain real (implementado):**
```
Home → Create Game (mintea NFT P1) → Team Select + Lobby → Join Game (mintea NFT P2)
→ Ambos set_team() → Partida arranca automaticamente → Battle Board → Result
```

No hay pantalla "Match Setup" separada — la partida comienza cuando ambos jugadores setean su equipo.

---

## 6.1 Pantalla 1: Home / Start
Objetivo: entrada al juego.
Debe mostrar:
- Nombre del juego y pitch corto
- Boton `Create Game` (llama `create_game()`, genera gameId, mintea NFT para el creador)
- Boton `Join Game` (input para gameId, llama `join_game(gameId)`, mintea NFT para el guest)
- Estado wallet (conectada/no conectada)
- Ultima version/build

Acciones:
- Crear partida -> ir a `Team Select + Lobby` (mostrando gameId para compartir)
- Unirse a partida -> ir a `Team Select`
- (Opcional) conectar wallet

---

## 6.2 Pantalla 2: Team Select + Lobby
Objetivo: armar equipo de 3 bestias y esperar al rival.

Esta pantalla combina seleccion de equipo y lobby de espera. Ambos jugadores (host y guest) ven la misma pantalla.

Debe mostrar:
- Lista de bestias disponibles (card por bestia)
- Filtros: tipo, tier, nivel
- Info por card:
  - Nombre
  - Tipo
  - Tier
  - Level
  - HP
  - Power base calculado
  - Prefix/suffix (si aplica)
- Contador de seleccion `X/3`
- Boton `Confirm Team` (llama `set_team(gameId, beast_1, beast_2, beast_3)`)
- `gameId` visible para compartir (copy to clipboard) — solo para host
- Estado del rival: `Waiting for opponent...` / `Opponent joined!` / `Opponent ready!`
- Resumen del equipo ya confirmado (si ya se seteo)
- Boton `Cancel`

Validaciones:
- No avanzar con menos de 3 bestias.
- No duplicar `tokenId`.

Transiciones:
- Ambos equipos seteados (`p1_team_set && p2_team_set`) → Battle Board (automatico)
- Cancel → volver a Home

---

## 6.3 Pantalla 3: Battle Board
Objetivo: turno de juego — seleccionar acciones y ver resolucion.

Debe mostrar:
- Grilla hex completa con posicion de cada bestia y obstaculos
- Indicador claro de quien tiene el turno activo
- HUD por jugador:
  - Bestias vivas/KO
  - HP actual / max por bestia
  - Extra lives restantes
  - Pocion disponible (si/no)
- Panel de unidad seleccionada:
  - Stats
  - Acciones posibles segun posicion/rango
- Indicador de ronda actual
- Battle log acumulativo (evento por evento)

**Turno del jugador atacante:**
- Selecciona 1 accion por bestia activa
- CTA `Confirm Actions` (envia una sola transaccion onchain)
- Se resuelven las acciones secuencialmente con feedback visual:
  - Highlight de ventaja/desventaja de tipo
  - Criticos
  - Contraataque automatico del defensor
  - Consumo de extra life
  - KO
- Boton `Skip Animation` (salta visual, no logica)
- Al terminar: turno pasa al otro jugador

**Turno del jugador defensor (observador):**
- Ve la grilla pero no puede interactuar ni tomar decisiones
- Observa las acciones del rival y las respuestas automaticas de sus bestias
- No necesita firmar ninguna transaccion durante este turno

Al finalizar la ronda (ambos turnos):
- Si no hay ganador: nueva ronda.
- Si hay ganador: ir a `Result`.

---

## 6.4 Pantalla 4: Result
Objetivo: cerrar partida y facilitar re-juego.

Debe mostrar:
- Ganador
- Score EGS del ganador (formula: `(MAX_ROUNDS - rondas) * 10 + WIN_BONUS`)
- Resumen de rondas
- KOs por equipo
- Dano total por bestia (calculado en frontend via eventos de Torii)
- Criticos conectados (calculado en frontend)
- Consumibles usados
- NFT del jugador (token_id, estado: winner/loser)
- Achievements desbloqueados (FirstBlood, Veteran, Flawless)
- Botones:
  - `Play Again` (crea nueva partida con mismo equipo)
  - `Back to Home`

Nota: el contrato emite `GameFinished` con game_id, winner, rounds y time. Para stats detallados (dano por bestia, crits) el frontend deberia reconstruirlos leyendo el estado final de las bestias via Torii, o se pueden agregar eventos de combate granulares en futuras iteraciones.

---

## 6.5 Pantalla 5: Match History (opcional MVP+)
Objetivo: depuracion y analisis de balance.

Debe mostrar:
- Lista de eventos de la partida
- Filtros por ronda / bestia
- Export JSON del battle log

---

## 7. Plan de implementacion (7 dias)

## Dia 1 - Core domain
- Definir tipos TS (`Beast`, `Action`, `BattleState`, `BattleEvent`)
- Definir funciones configurables (`getLuck`, `getMoveRange`, `getAttackRange`, `getCounterDamage`, `canTeamIncludeBeast`)
- Cargar y normalizar dataset de `beasts-all.json` (`Magic` -> `Magical`)
- Test unitario de formulas base

Entregable: motor de datos compilando, sin UI final.

## Dia 2 - Combat engine
- Implementar pipeline de dano
- Implementar ataque + contraataque automatico
- Implementar criticos, type advantage, potion
- Implementar extra lives y KO
- Implementar logica de turnos alternados

Entregable: simulacion en tests con logs deterministas.

## Dia 3 - Lobby + networking base
- Crear partida (genera gameId)
- Unirse a partida (por gameId)
- Sincronizacion de estado entre dos clientes
- Pantalla Home con Create/Join

Entregable: dos clientes conectados a la misma partida.

## Dia 4 - Hex board + turno
- Render de grilla hex con obstaculos
- Posiciones iniciales fijas por jugador (P1 arriba, P2 abajo)
- UI para asignar acciones por bestia (turno activo)
- Validaciones de acciones (rango, celda ocupada)

Entregable: turno completo planificado.

## Dia 5 - Resolution UX + loop
- Resolucion visual secuencial de acciones
- Battle log visible
- Transiciones turno J1 -> turno J2 -> nueva ronda
- Cambio de turno entre clientes

Entregable: loop de combate jugable PvP.

## Dia 6 - Team Select + Lobby + Result
- Pantalla Team Select + Lobby (combinada) con filtros y seleccion de 3 bestias
- Pantalla Result con resumen de dano/KO/crit y score EGS
- Reconexion basica por gameId

Entregable: flujo end-to-end.

## Dia 7 - Balance + QA + demo
- Ajuste de valores en funciones configurables
- Testing manual intensivo
- Correccion de bugs de reglas
- Pulido UI/feedback
- Logs exportables
- Documentacion tecnica breve
- Demo estable

Entregable: MVP presentable.

---

## 8. Criterios de aceptacion (Definition of Done)

- Se puede jugar una partida completa 1v1 de inicio a fin.
- El combate respeta las reglas declaradas en esta especificacion.
- El resultado de ronda es determinista con misma seed/inputs.
- Toda accion relevante queda en battle log.
- No hay bloqueos de flujo en UI (seleccion -> partida -> resultado -> replay).

---

## 9. Integracion onchain con Embeddable Game Standard (EGS)

**Estado: IMPLEMENTADO.** Los contratos en `tactical-beasts/contracts/` ya integran EGS con `cartridge-gg/arcade`. Ver `contracts/docs/EGS_INTEGRATION.md` para documentacion detallada.

### 9.1 Resumen de lo implementado

| Componente | Estado | Descripcion |
|------------|--------|-------------|
| Collection (ERC721) | Implementado | `systems/collection.cairo` — NFT con ERC4906/ERC7572, MINTER_ROLE para game_system |
| Leaderboard (RankableComponent) | Implementado | Embebido en game_system, top 100, submit al ganar |
| Achievements (AchievableComponent) | Implementado | 3 logros: FirstBlood (1 win), Veteran (10 wins), Flawless (sin perder bestias) |
| IMinigameTokenData | Implementado | `score(token_id) -> u64` y `game_over(token_id) -> bool` |
| 2 NFTs por partida | Implementado | Cada jugador recibe su token al crear/unirse |

Quests (`QuestableComponent`) y Starterpacks (`StarterpackComponent`) quedan fuera del MVP. Se pueden agregar en futuras iteraciones.

### 9.2 Dependencias Cairo (Scarb.toml)

```toml
[dependencies]
dojo = "1.8.0"
dojo_cairo_macros = "1.8.0"
starknet = "2.13.1"
leaderboard = { git = "https://github.com/cartridge-gg/arcade", rev = "1c66ba7" }
collection = { git = "https://github.com/cartridge-gg/arcade", rev = "1c66ba7" }
achievement = { git = "https://github.com/cartridge-gg/arcade", rev = "1c66ba7" }
openzeppelin = "2.0.0"
graffiti = { git = "https://github.com/bal7hazar/graffiti.git", rev = "e8b0854" }
```

Usa 3 paquetes de arcade: `achievement`, `leaderboard`, `collection`.

**Nota sobre OpenZeppelin:** Se debe pinear `openzeppelin_utils = 2.0.0` en `Scarb.lock`. Si el resolver toma 2.1.0, rompe `openzeppelin_token-2.0.0`.

### 9.3 Arquitectura: componentes embebidos via Dojo

**Contrato game_system (sistema principal):**
Embebe 2 componentes de arcade:
- `AchievableComponent` (de `achievement`) — trackea logros del jugador
- `RankableComponent` (de `leaderboard`) — submite scores al leaderboard

**Contrato Collection (NFT ERC721):**
Embebe componentes de `collection` (`ERC4906Component`, `ERC7572Component`) + OpenZeppelin ERC721.
- Cada jugador recibe un NFT al crear/unirse a partida
- `token_uri` devuelve JSON con metadata de la partida (match_id, status, winner)
- MINTER_ROLE otorgado a game_system via DNS lookup en `dojo_init`
- Registro como contrato externo para indexacion por Torii

### 9.4 Como se usan concretamente

**2 NFTs por partida:**
- `create_game()` mintea token para P1, `join_game()` mintea token para P2
- Cada token mapea a `(match_id, player)` via `GameToken`
- `GameTokens` trackea ambos token_ids por partida
- Necesario para Budokan: cada jugador submite su score independientemente

**Achievements:**
- 3 logros definidos en `elements/achievements.cairo` con metadata (titulo, descripcion, icono, puntos)
- Registrados en `dojo_init` via `achievable.create()`
- Progreso automatico al ganar: `achievable.progress(world, player, TASK_WINNER, 1, true)`
- Victoria perfecta: `achievable.progress(world, player, TASK_FLAWLESS, 1, true)`

**Leaderboard:**
- Un solo leaderboard (ID=1), capacidad top 100.
- Al ganar una partida:
  ```
  rankable.submit(world, LEADERBOARD_ID, winner_token_id, player_id, score, time, true)
  ```
- Score compuesto: `(MAX_ROUNDS - round) * 10 + WIN_BONUS` (u64)

**Score formula:**
- MAX_ROUNDS = 50, WIN_BONUS = 100
- Ronda 1: score = 590, Ronda 50: score = 100
- Perdedor: score = 0

### 9.5 build-external-contracts (Scarb.toml)

```toml
[[target.starknet-contract]]
build-external-contracts = [
  "dojo::world::world_contract::world",
  "achievement::models::index::m_AchievementDefinition",
  "achievement::models::index::m_AchievementCompletion",
  "achievement::models::index::m_AchievementAdvancement",
  "achievement::models::index::m_AchievementAssociation",
  "achievement::events::index::e_TrophyCreation",
  "achievement::events::index::e_TrophyProgression",
  "achievement::events::index::e_AchievementCompleted",
  "achievement::events::index::e_AchievementClaimed",
  "leaderboard::events::index::e_LeaderboardScore",
]
```

### 9.6 Deployment (dojo_dev.toml)

```toml
[migration]
order_inits = ["TB-game_system", "TB-Collection"]

[writers]
"TB" = ["TB-game_system"]

[owners]
"TB" = ["TB-Collection"]
```

**El orden importa:** game_system primero (para que exista en DNS cuando Collection otorga MINTER_ROLE).

### 9.7 Checklist de integracion (completado)

- [x] Dependencia de `cartridge-gg/arcade` (no `game-components`)
- [x] Embeber `AchievableComponent` y `RankableComponent` en game_system
- [x] Contrato Collection con ERC721/ERC4906/ERC7572
- [x] Definir 3 achievements localmente con metadata
- [x] Registrarlos en `dojo_init` via `achievable.create()`
- [x] Mintear NFTs en `create_game()` y `join_game()`
- [x] Submit score al leaderboard al ganar
- [x] Progress achievements al ganar (WINNER + FLAWLESS)
- [x] Implementar `IMinigameTokenData` (score + game_over)
- [x] Declarar `build-external-contracts` para modelos de arcade
- [x] Tests end-to-end (33 tests, todos pasan)
- [ ] (Futuro) Quests (`QuestableComponent`)
- [ ] (Futuro) Starterpacks (`StarterpackComponent`)
