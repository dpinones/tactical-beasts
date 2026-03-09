# Tactical Beasts

Juego tactico PvP 1v1 por turnos en Starknet. Cada jugador arma un equipo de 3 bestias NFT de Loot Survivor y combate en una grilla hexagonal con obstaculos.

Parte del ecosistema [Provable Games](https://docs.provable.games/) — las bestias, formulas de combate e integracion de torneos vienen de la infraestructura onchain compartida.

## Gameplay

### Flujo

1. **Buscar Partida** o **Invitar a un Amigo** — el matchmaking te empareja con un oponente, o crea una partida privada con reglas custom.
2. **Seleccionar Equipo** — elegi 3 bestias de tu coleccion NFT. La composicion del equipo se valida onchain (limites de tier, balance de subclases).
3. **Batalla** — turnos alternados en un tablero hex. Mover, atacar o usar consumibles. El contrato resuelve dano, pasivas, criticos y contraataques.
4. **Resultado** — el ganador se determina cuando todas las bestias del oponente quedan KO. Stats y score se registran onchain.

### El Tablero

- Grilla hex con filas `[6, 7, 8, 7, 8, 7, 6]`.
- 6 obstaculos generados por partida.
- Posiciones de spawn fijas por lado.

### Triangulo de Combate

```
Magical > Brute > Hunter > Magical
```

La ventaja de tipo da +50% de dano, la desventaja da -50%. Derivado de las reglas de combate de Death Mountain.

### Formula de Dano

**Dano base**: `Level × (6 - Tier)` via formula de Death Mountain. Minimo 2.

---

## Subclases

Cada tipo de bestia tiene dos subclases con roles, rangos y pasivas distintas:

### Magical

| Subclase | Rol | Mov | Rango Ataque | Pasiva |
|----------|-----|:---:|:------------:|--------|
| **Warlock** | Glass Cannon | 2 | 3 | **Siphon** — cura 15% del dano infligido |
| **Enchanter** | Soporte | 2 | 2 | **Regen** — inicia con +8% HP max |

### Hunter

| Subclase | Rol | Mov | Rango Ataque | Pasiva |
|----------|-----|:---:|:------------:|--------|
| **Stalker** | Asesino | 3 | 1 (melee) | **First Strike** — +15% dano vs objetivos con HP llena |
| **Ranger** | Francotirador | 2 | 4 | **Exposed** — recibe +30% dano de enemigos adyacentes |

### Brute

| Subclase | Rol | Mov | Rango Ataque | Pasiva |
|----------|-----|:---:|:------------:|--------|
| **Juggernaut** | Tanque | 2 | 1 (melee) | **Fortify** — -10% dano recibido si no se movio el turno anterior |
| **Berserker** | Bruiser | 2 | 1 (melee) | **Rage** — +12% dano cuando esta por debajo de 50% HP |

**Notas tacticas clave:**
- Stalker es la unica subclase con 3 de movimiento — el asesino que cierra distancias rapido.
- Ranger tiene 4 de rango de ataque pero es vulnerable de cerca (la pasiva Exposed es una desventaja).
- Warlock se sustenta con Siphon pero tiene poca HP.
- Juggernaut premia el posicionamiento y mantener terreno.
- Berserker se vuelve mas fuerte al recibir dano — riesgoso dejarlo vivo con poca HP.
- El Regen de Enchanter se aplica al crearse, dando una ventaja plana de HP desde el inicio.

---

## Restricciones de Equipo y Configuracion de Partida

### Reglas por Defecto

- Solo bestias T2, T3, T4 permitidas (T1 legendarias y T5 comunes excluidas).
- Maximo 1 bestia T2 por equipo.
- Maximo 2 bestias T3 por equipo.
- T4 sin limite adicional.
- Tamano de equipo: 3 bestias.

### Configuracion Custom (Partidas con Amigos)

Al jugar con amigos, podes crear configuraciones custom que modifican:

| Parametro | Descripcion | Default |
|-----------|-------------|---------|
| `min_tier` / `max_tier` | Rango de tiers permitidos | T2–T4 |
| `max_t2_per_team` | Max bestias T2 por jugador | 1 |
| `max_t3_per_team` | Max bestias T3 por jugador | 2 |
| `beasts_per_player` | Tamano del equipo | 3 |

Las configuraciones custom se crean onchain y se les asigna un `settings_id`. Cualquier jugador puede crear una partida con amigos usando un perfil de configuracion existente, habilitando diferentes formatos: drafts all-T4, equipos mas grandes, torneos restringidos por tier, etc.

---

## Integracion EGS (Torneos Budokan)

Tactical Beasts implementa el [Embeddable Game Standard](https://github.com/Provable-Games/game-components) para compatibilidad completa con Budokan, el framework de torneos onchain:

- **NFT por sesion**: cada jugador recibe un token ERC721 cuando arranca una partida (minteado via EGS).
- **`score(token_id)`**: retorna score acumulado de partidas ranked. Formula: `(wins × 500) + (kills × 50) + (beasts_alive × 30)`.
- **`game_over(token_id)`**: retorna true cuando la partida termina o el tiempo del torneo expira.
- **`settings_exist(settings_id)`**: valida configuraciones de partida para la configuracion del torneo.
- Las partidas con amigos estan excluidas del scoring EGS y stats de perfil.

Esto significa que las partidas de Tactical Beasts pueden ser parte de torneos Budokan con leaderboards automatizados y distribucion de premios.

---

## Integraciones del Ecosistema

| Integracion | Que se usa | Donde |
|---|---|---|
| **Death Mountain** | Formula de dano, triangulo de tipos, ventaja ±50% | `contracts/src/logic/combat.cairo` |
| **Loot Survivor Beasts** | 75 especies (3 tipos × 5 tiers), ownership de NFTs | Summit API + `beasts-all.json` |
| **EGS (game-components)** | `IMinigameTokenData`, `IMinigameSettings`, NFTs de sesion | `contracts/src/systems/game_system.cairo` |
| **Summit API** | Obtener bestias NFT del jugador | `src/hooks/useOwnedBeasts.ts` |
| **Cartridge Controller** | Auth de wallet, session keys | `src/dojo/controller/` |
| **Denshokan SDK** | Features del ecosistema | `package.json` |
| **Supabase** | Amigos, invitaciones, realtime | `src/services/supabase.ts` |

---

## Quick Start

```bash
# Instalar
npm install --legacy-peer-deps

# Desarrollo local (requiere Dojo toolchain)
make katana    # Levantar nodo Starknet local
make setup     # Build, migrate, generar bindings, iniciar Torii
make dev       # Iniciar servidor de desarrollo frontend

# Sepolia
make dev-sepolia

# Mainnet
make dev-mainnet
```

## Stack

Dojo 1.8.x · Cairo 2.15.x · React · Chakra UI · Starknet.js · Cartridge Controller · Torii · Supabase
