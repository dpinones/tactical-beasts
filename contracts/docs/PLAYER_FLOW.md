# Flow de Jugadores — Tactical Beasts

## Diagrama general

```
Jugador 1 (Host)                          Jugador 2 (Guest)
─────────────────                         ─────────────────
create_game()
  → game_id = 1
  → NFT minteado (token_id = 1)
  → Game { status: WAITING }

Comparte game_id al rival
                                          join_game(game_id: 1)
                                            → NFT minteado (token_id = 2)
                                            → Game { player2: guest }

set_team(game_id, 1, 26, 51)              set_team(game_id, 10, 40, 60)
  → p1_team_set = true                      → p2_team_set = true
  → BeastState x3 creados                   → BeastState x3 creados

         Ambos equipos seteados → try_start_game()
         → Game { status: PLAYING, round: 1 }
         → current_attacker = 1 o 2 (pseudo-random)
         → Posiciones spawn asignadas

─── LOOP DE TURNOS ───────────────────────────────────────

Turno del atacante (ej: P1)               Turno del defensor (P2)
                                          (solo observa, sin input)
execute_turn(game_id, [
  Action { beast_index: 0,
           action_type: 2,   // ATTACK
           target_index: 1,
           target_row: 0,
           target_col: 0 },
  Action { beast_index: 1,
           action_type: 1,   // MOVE
           target_index: 0,
           target_row: 3,
           target_col: 3 },
  Action { beast_index: 2,
           action_type: 0,   // WAIT
           target_index: 0,
           target_row: 0,
           target_col: 0 },
])
  → Resuelve acciones en orden
  → Contraataques automaticos
  → check_victory()
  → current_attacker cambia

                                          execute_turn(game_id, [...])
                                            → Ahora P2 es atacante
                                            → P1 solo observa
                                            → round += 1 al terminar

─── FIN DE PARTIDA ───────────────────────────────────────

Cuando check_victory() detecta ganador:
  → Game { status: FINISHED, winner: addr }
  → Score calculado: (50 - round) * 10 + 100
  → rankable.submit() al leaderboard
  → collection.update() metadata del NFT
  → achievable.progress(TASK_WINNER)
  → Si victoria perfecta: achievable.progress(TASK_FLAWLESS)
```

## Detalle por método

### create_game() → u32

**Quién llama:** Jugador 1 (host)
**Cuándo:** Al iniciar una partida nueva

```
Entrada: (ninguna)
Salida:  game_id: u32

Efectos onchain:
  1. GameConfig.game_count += 1
  2. Collection.mint(caller) → token_id
  3. GameConfig.token_count = token_id
  4. GameToken { token_id, match_id: game_id, player: caller }
  5. GameTokens { match_id: game_id, p1_token_id: token_id, p2_token_id: 0 }
  6. Game { game_id, player1: caller, status: WAITING, ... }
  7. Evento: GameCreated { game_id, player1, time }
```

### join_game(game_id: u32)

**Quién llama:** Jugador 2 (guest)
**Cuándo:** Después de recibir el game_id del host

```
Entrada: game_id
Salida:  (ninguna)

Validaciones:
  - Game.status == WAITING
  - caller != Game.player1 (no unirse a tu propia partida)
  - Game.player2 == 0 (no hay otro jugador ya)

Efectos onchain:
  1. Collection.mint(caller) → token_id
  2. GameConfig.token_count = token_id
  3. GameToken { token_id, match_id: game_id, player: caller }
  4. GameTokens.p2_token_id = token_id
  5. Game.player2 = caller
  6. Evento: PlayerJoined { game_id, player2, time }
  7. Intenta iniciar partida via try_start_game()
```

### set_team(game_id: u32, beast_1: u32, beast_2: u32, beast_3: u32)

**Quién llama:** Ambos jugadores (P1 y P2, cada uno por separado)
**Cuándo:** Después de create/join, al confirmar equipo en el cliente

```
Entrada: game_id, 3 beast IDs (ej: 1=Magical, 26=Hunter, 51=Brute)
Salida:  (ninguna)

Validaciones:
  - Game.status == WAITING
  - caller es player1 o player2
  - Equipo no seteado previamente (p1_team_set/p2_team_set == false)

Efectos onchain:
  1. PlayerState { game_id, player, player_index, beast_1, beast_2, beast_3, potion_used: false }
  2. BeastState x3 creados con:
     - beast_type derivado del ID (1-25=Magical, 26-50=Hunter, 51-75=Brute)
     - hp = 100, extra_lives = 1, level = 5, tier = 3 (defaults MVP)
  3. Game.p1_team_set = true (o p2_team_set)
  4. Intenta iniciar partida via try_start_game()

Si ambos equipos seteados (try_start_game):
  5. Game.status = PLAYING
  6. Game.round = 1
  7. Game.current_attacker = (timestamp + game_id) % 2 + 1
  8. Posiciones spawn asignadas:
     P1: (0,1), (0,3), (1,5)
     P2: (6,1), (6,3), (5,1)
```

### execute_turn(game_id: u32, actions: Array\<Action\>)

**Quién llama:** Solo el jugador atacante (current_attacker)
**Cuándo:** Cada turno, después de planificar acciones en el cliente

```
Entrada: game_id, array de acciones (1 por bestia viva)
Salida:  (ninguna)

Validaciones:
  - Game.status == PLAYING
  - caller == jugador del current_attacker
  - actions.len() == cantidad de bestias vivas del atacante

Tipos de acción:
  0 = WAIT                  → no hace nada
  1 = MOVE                  → mueve bestia a celda válida
  2 = ATTACK                → ataca bestia enemiga en rango
  3 = CONSUMABLE_ATTACK     → ataca con +10% daño (1 poción por partida por jugador)

Resolución por acción (en orden del array):

  WAIT:
    → Nada

  MOVE:
    → Valida celda válida, no obstáculo, no ocupada, en rango (≤ 2 hexes)
    → Actualiza position_row, position_col

  ATTACK / CONSUMABLE_ATTACK:
    → Valida objetivo vivo y en rango (≤ 1 hex)
    → Si CONSUMABLE: valida poción no usada, marca potion_used = true
    → Calcula daño: level * (6 - tier) * type_advantage * potion * crit
    → Aplica daño al defensor:
       - Si hp llega a 0 y extra_lives > 0: consume 1 vida, restaura hp_max
       - Si hp llega a 0 y extra_lives == 0: alive = false (KO)
    → Si defensor sobrevive: CONTRAATAQUE automático
       - Misma fórmula de daño (sin poción)
       - Puede matar al atacante

Después de resolver todas las acciones:
  → check_victory(): revisa si algún jugador perdió todas las bestias

  Si hay ganador:
    1. Game.status = FINISHED, Game.winner = winner
    2. Evento: GameFinished { game_id, winner, rounds, time }
    3. Score = (50 - round) * 10 + 100
    4. rankable.submit(LEADERBOARD_ID, winner_token_id, player_id, score, time)
    5. collection.update(winner_token_id) → evento ERC4906
    6. achievable.progress(player_id, TASK_WINNER, 1)
    7. Si 3 bestias vivas: achievable.progress(player_id, TASK_FLAWLESS, 1)

  Si no hay ganador:
    → current_attacker cambia (1→2 o 2→1)
    → Si vuelve a P1: round += 1
```

### score(token_id: u64) → u64

**Quién llama:** Budokan / cualquier contrato externo
**Cuándo:** Para consultar score de un jugador en una partida

```
Entrada: token_id (NFT del jugador)
Salida:  score (u64)

Lógica:
  1. GameToken = world.read_model(token_id)
  2. Game = world.read_model(GameToken.match_id)
  3. Si Game.status == FINISHED y Game.winner == GameToken.player:
     → return (50 - Game.round) * 10 + 100
  4. Sino: return 0
```

### game_over(token_id: u64) → bool

**Quién llama:** Budokan / cualquier contrato externo
**Cuándo:** Para verificar si la partida terminó

```
Entrada: token_id (NFT del jugador)
Salida:  bool

Lógica:
  1. GameToken = world.read_model(token_id)
  2. Game = world.read_model(GameToken.match_id)
  3. return Game.status == FINISHED
```

## Ejemplo completo: partida entre Alice y Bob

```
Alice                                     Bob
─────                                     ───

1. create_game()
   → game_id = 1
   → token_id = 1 (NFT de Alice)
   → Comparte "game_id: 1" a Bob

                                          2. join_game(1)
                                             → token_id = 2 (NFT de Bob)

3. set_team(1, 5, 30, 55)                4. set_team(1, 10, 40, 60)
   → Magical T1, Hunter T1, Brute T1        → Magical T2, Hunter T3, Brute T2
   → p1_team_set = true                     → p2_team_set = true
                                             → Partida arranca! (round 1)
                                             → current_attacker = 1 (Alice)

5. execute_turn(1, [                      (observa)
     ATTACK beast_0 → target_1,
     MOVE beast_1 → (3,3),
     WAIT beast_2
   ])
   → Daño, contraataque, etc.
   → current_attacker = 2 (Bob)

(observa)                                 6. execute_turn(1, [
                                               ATTACK beast_0 → target_0,
                                               ATTACK beast_1 → target_2,
                                               MOVE beast_2 → (4,3)
                                             ])
                                             → round = 2
                                             → current_attacker = 1 (Alice)

... (varios turnos más) ...

N. execute_turn(1, [ATTACK, ATTACK, WAIT])
   → Última bestia de Bob muere
   → check_victory() → Alice gana
   → Score = (50 - 8) * 10 + 100 = 520
   → Leaderboard actualizado
   → NFT metadata actualizada
   → Achievement "FirstBlood" progresado

Consultas post-partida:
  score(1) → 520  (Alice ganó)
  score(2) → 0    (Bob perdió)
  game_over(1) → true
  game_over(2) → true
```
