# Tactical Beasts

Juego tactico PvP por turnos en Starknet, construido con Dojo + React. Cada jugador arma un equipo de 3 bestias NFT y resuelve acciones sobre un tablero hexagonal.

## 1. TL;DR

- Modo: `PvP 1v1` por turnos alternados.
- Stack: `Dojo 1.8.x + Cairo 2.13.x + Starknet + Torii + React + Chakra`.
- Flujo: `create/join -> set team -> coin flip visual -> battle`.
- Estado: funcional end-to-end en entorno local/dev.
- Integraciones: onchain game state + Supabase para social/friends/invites.

---

## 2. Demo

- Video: `PENDIENTE_LINK_VIDEO`
- Demo URL: `PENDIENTE_LINK_APP`
- Repo: `PENDIENTE_LINK_REPO`
- Pitch deck: `PENDIENTE_LINK_DECK`

---

## 3. Problema y propuesta

Tactical Beasts busca llevar combate tactico de bestias NFT a una experiencia onchain jugable, con:

- resolucion determinista de turnos,
- estado verificable en contrato,
- UI rapida para planificacion de acciones,
- y capa social (friend list + game invites) para reducir friccion de partida.

---

## 4. Que esta implementado hoy

### Gameplay onchain

- Crear partida (`create_game` y `create_friendly_game`).
- Unirse a partida (`join_game`).
- Setear equipo de 3 bestias (`set_team`).
- Ejecutar turno con acciones (`execute_turn`).
- Abandonar partida (`abandon_game`).
- Finalizacion y ganador onchain.
- Score para EGS (`score`) y estado de cierre (`game_over`).
- Perfil onchain basico de jugador (wins/losses/kills/deaths/abandons).

### Reglas de combate actuales

- 3 bestias por jugador.
- Tablero hex con filas `[6,7,8,7,8,7,6]`.
- Obstaculos: 6 por partida (generados en contrato).
- Posiciones de spawn fijas por lado.
- Tipos: `Magical`, `Hunter`, `Brute`.
- Triangulo de ventaja de tipo.
- Dano base derivado de formula Death Mountain.
- Critico y contraataque automatico.
- Restriccion de tiers en equipo: solo T2-T4 y limites de composicion.

### Frontend

- Home/login (Controller y Guest segun red).
- Matchmaking normal y friendly invite flow.
- Team Select con filtros y preview de mapa.
- Animacion de coin toss al iniciar batalla (visual).
- Battle UI completa: seleccion de bestias, planificacion, reset ultimo, confirmacion de turno, battle log.
- Result screen.
- My Beasts y Profile.

### Social / Supabase

- Perfil publico (`player_config`).
- Friend requests.
- Game invites.
- Realtime subscriptions para requests/invites.

---

## 5. Arquitectura

### Frontend

- `React + Vite + Chakra UI + Zustand + react-query + react-router`.
- Cliente Dojo inicializado en `src/main.tsx`.
- Rutas principales en `src/AppRoutes.tsx`.

Rutas:

- `/` Home
- `/matchmaking`
- `/my-beasts`
- `/profile`
- `/team-select/create`
- `/team-select/join/:gameId`
- `/team-select/match/:gameId`
- `/battle/:gameId`
- `/result/:gameId`

### Onchain

- Contrato principal: `contracts/src/systems/game_system.cairo`.
- Modelos Dojo: `Game`, `BeastState`, `PlayerState`, `MapState`, `PlayerProfile`, etc.
- Logica separada:
  - `contracts/src/logic/combat.cairo`
  - `contracts/src/logic/board.cairo`
  - `contracts/src/logic/beast.cairo`

### Lectura de estado

- Torii GraphQL queries desde `src/hooks/useGameQuery.ts`.
- Parseo de modelos en frontend a tipos TS (`src/domain/types.ts`).

### Social backend

- Supabase (`src/lib/supabase.ts`, `src/services/supabase.ts`).
- Esquema SQL en `supabase-schema.sql`.

---

## 6. Flujo de jugador

1. Jugador A crea partida.
2. Jugador B se une por Game ID o invite.
3. Ambos seleccionan 3 bestias.
4. Cuando ambos equipos estan listos:
   - se muestra animacion de moneda (frontend visual),
   - luego entra a battle.
5. Atacante del turno ejecuta acciones y confirma.
6. Contrato resuelve y cambia atacante.
7. Al terminar, se navega a resultados.

Notas:

- La animacion de moneda actual es de presentacion UX.
- El atacante real en partida lo determina estado onchain (`current_attacker`).

---

## 7. Setup local

### Prerrequisitos

- Node.js `>=20`
- Scarb / Sozo / Katana / Torii compatibles con Dojo 1.8.x
- npm

### 1) Instalar dependencias frontend

```bash
npm install --legacy-peer-deps
```

### 2) Variables de entorno

Actualmente no hay `.env_example`. Crear `.env.development` con base minima:

```env
VITE_DOJO_NAMESPACE=TB2
VITE_ENABLE_VRF=false

VITE_MASTER_ADDRESS=0x...
VITE_MASTER_PRIVATE_KEY=0x...

VITE_PUBLIC_ACCOUNT_CLASS_HASH=0x...
VITE_NETWORK_FEE_TOKEN=0x...

VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Opcional
# VITE_SLOT_INSTANCE=your-slot
# VITE_CHAIN=sepolia
# VITE_CONTROLLER_PRESET=your-preset
# VITE_VRF_PROVIDER_ADDRESS=0x...
```

Importante:

- El namespace del frontend debe matchear el del contrato desplegado.
- Si no matchea, fallan queries de Torii (no encuentra modelos).

### 3) Levantar stack onchain local

Opcion A paso a paso:

```bash
make katana
make build
make migrate
make copy-manifest
npm run generate
make torii
npm run dev
```

Opcion B combinada:

```bash
make katana
make setup
npm run dev
```

`make setup` ejecuta:

- build contrato
- migrate
- copy manifest
- generate bindings TS
- torii

---

## 8. Setup Supabase

1. Crear proyecto Supabase.
2. Ejecutar `supabase-schema.sql` en SQL editor.
3. Confirmar tablas:
   - `player_config`
   - `friendships`
   - `game_invites`
4. Confirmar realtime para `friendships` y `game_invites`.
5. Completar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env.development`.

Nota de seguridad hackaton:

- RLS esta abierta para acelerar desarrollo demo.
- Para produccion hay que endurecer policies.

---

## 9. Scripts utiles

### Frontend

- `npm run dev`
- `npm run dev:sepolia`
- `npm run build`
- `npm run build:sepolia`
- `npm run preview`
- `npm run generate`
- `npm run test`

### Contratos (Makefile)

- `make katana`
- `make build`
- `make test`
- `make migrate`
- `make torii`
- `make setup`
- `make migrate-sepolia`
- `make torii-sepolia`
- `make dev-sepolia`
- `make build-sepolia`

---

## 10. Variables de entorno (detalle)

- `VITE_DOJO_NAMESPACE`: namespace usado en queries/modelos.
- `VITE_SLOT_INSTANCE`: nombre de deployment Cartridge Slot.
- `VITE_CHAIN`: `mainnet | sepolia |` vacio/local.
- `VITE_MASTER_ADDRESS`: cuenta master para burner manager.
- `VITE_MASTER_PRIVATE_KEY`: privada master.
- `VITE_PUBLIC_ACCOUNT_CLASS_HASH`: class hash para cuentas burner.
- `VITE_NETWORK_FEE_TOKEN`: token de fee para deploy/calls burner.
- `VITE_ENABLE_VRF`: habilita policy VRF en controller.
- `VITE_VRF_PROVIDER_ADDRESS`: direccion del provider VRF.
- `VITE_CONTROLLER_PRESET`: preset de Cartridge Controller.
- `VITE_SUPABASE_URL`: URL de proyecto Supabase.
- `VITE_SUPABASE_ANON_KEY`: anon key Supabase.

---

## 11. Estado de build y known issues

### Build actual

`npm run build` puede fallar por codigo legacy no usado en runtime principal:

- `src/pages/GamePage.tsx` desfasado respecto al estado actual.
- `src/dojo/typescript/contracts.gen.ts` con tipo `Action` faltante en ciertos escenarios de generacion.

### Recomendacion para demo hackaton

- Ejecutar por `npm run dev` para demo funcional.
- Mantener esta seccion de known issues explicita para transparencia.

---

## 12. Sistema de combate (detallado)

El calculo real esta implementado onchain en `contracts/src/logic/combat.cairo` y aplicado desde `contracts/src/systems/game_system.cairo`.

### Formula de dano (orden exacto)

1. **Dano base**
- Se usa `death_mountain_combat::calculate_damage(...)`.
- Se respeta `MIN_DAMAGE = 2`.

2. **Pocion ofensiva**
- Si la accion es `CONSUMABLE_ATTACK`:
  - `damage = damage * 110 / 100` (+10%).

3. **Critico**
- Si hay critico:
  - `damage = damage * 2`.

4. **Pasivas ofensivas**
- Berserker (Rage): +12% si `hp < 50%`.
- Stalker (First Strike): +15% si el objetivo esta en `hp == hp_max`.

5. **Pasivas defensivas**
- Juggernaut (Fortify): -10% dano recibido si `last_moved == false`.
- Ranger (Exposed): recibe +30% dano si el atacante esta adyacente (`dist <= 1`).

6. **Aplicacion de dano**
- Si `damage >= hp`:
  - si `extra_lives > 0`, consume una vida y vuelve a `hp_max`,
  - si no, queda KO (`alive = false`).

### Critico

- `luck` actual por defecto: `10` (10%).
- `roll_crit` usa hash Poseidon con seed del turno.
- El contraataque tambien puede criticar.

### Contraataque

- Si el defensor sobrevive, contraataca automaticamente.
- El contraataque usa la misma formula base, pero luego se reduce:
  - `counter_damage = full_counter * 20 / 100` (`COUNTER_ATTACK_PCT = 20`).
- Se fuerza minimo:
  - `counter_damage >= 2`.
- Importante: las pasivas no se aplican en contraataques (estado actual de implementacion).

### Rangos y constantes globales

- `MIN_DAMAGE = 2`
- `DEFAULT_MOVE_RANGE = 2`
- `DEFAULT_ATTACK_RANGE = 1`
- `DEFAULT_EXTRA_LIVES = 1`

---

## 13. Subclases: movimiento, ataque y pasivas

| Subclase | Tipo | Move Range | Attack Range | Pasiva |
|---|---|---:|---:|---|
| Warlock | Magical | 2 | 3 | Siphon: cura 15% del dano infligido |
| Enchanter | Magical | 2 | 2 | Regen Start: inicia con +8% `hp_max` |
| Stalker | Hunter | 3 | 1 | First Strike: +15% dano a objetivo full HP |
| Ranger | Hunter | 2 | 4 | Exposed: recibe +30% dano si atacante adyacente |
| Juggernaut | Brute | 2 | 1 | Fortify: -10% dano recibido si no se movio |
| Berserker | Brute | 2 | 1 | Rage: +12% dano con HP por debajo de 50% |

Notas de implementacion:

- `Stalker` es la unica subclase con move 3.
- Rango de ataque especial:
  - Ranger 4
  - Warlock 3
  - Enchanter 2
  - resto 1
- Enchanter aplica su bonus de HP al crear la bestia.

---

## 14. Tipos y ventaja

- `Brute > Hunter`
- `Hunter > Magical`
- `Magical > Brute`

La ventaja/desventaja se refleja en el calculo de dano onchain via formula Death Mountain.

---

## 15. Restricciones de equipo

- Solo se permiten bestias T2, T3, T4.
- Limite por equipo:
  - maximo 1 bestia T2
  - maximo 2 bestias T3
  - T4 sin limite adicional

---

## 16. Reglas de gameplay (resumen tecnico)

- Team size: 3.
- Turnos alternados por `current_attacker`.
- Accion de ataque y movimiento validada onchain.
- Consumible ataque: una vez por jugador/partida.
- Counterattack automatico.
- Extra lives por bestia.
- Victoria cuando el rival no tiene bestias activas.

---

## 17. Integraciones externas

- Summit API para bestias por owner:
  - endpoint usado: `https://summit-production-69ed.up.railway.app/beasts/{owner}`
- Fallback local para guest/dev:
  - `beasts-average.json`

---

## 18. Seguridad y trust assumptions

- Contrato como fuente de verdad de combate y estado de partida.
- Validaciones de ownership de bestias en mainnet path onchain.
- En entorno hackaton/local algunas validaciones y policies estan simplificadas.
- Supabase actual con policies abiertas (solo para demo).

---

## 19. Que falta para produccion

- Endurecer RLS y auth de Supabase.
- CI de tests onchain + frontend.
- E2E testing del flujo completo.
- Eliminar/aislar codigo legacy (`GamePage`) del pipeline de build.
- Documentar y estabilizar generacion de bindings TS.
- Telemetria y observabilidad de errores runtime.

---

## 20. Estructura de proyecto (real)

```text
contracts/
  src/
    systems/
      game_system.cairo
      collection.cairo
    logic/
      combat.cairo
      board.cairo
      beast.cairo
    models/index.cairo
    tests/
src/
  pages/
    HomePage.tsx
    MatchmakingPage.tsx
    TeamSelectPage.tsx
    BattlePage.tsx
    ResultPage.tsx
    MyBeastsPage.tsx
    ProfilePage.tsx
  components/
    HexGrid.tsx
    BeastHUD.tsx
    PlannedActions.tsx
    BattleLog.tsx
    CoinFlipIntro.tsx
  hooks/
    useGameActions.ts
    useGameQuery.ts
    useOwnedBeasts.ts
  services/supabase.ts
  dojo/
  config/
public/
supabase-schema.sql
tactical_beats.md
```

