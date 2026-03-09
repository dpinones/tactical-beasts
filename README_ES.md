# Tactical Beasts

Juego tactico por turnos PvP 1v1 en Starknet. Arma un equipo de 3 bestias NFT del ecosistema [Loot Survivor](https://lootsurvivor.io) y batalla en una grilla hexagonal con obstaculos, posicionamiento estrategico y habilidades de subclase.

Parte del ecosistema [Provable Games](https://docs.provable.games/) — las bestias, formulas de combate e integracion con torneos provienen de infraestructura compartida onchain. Toda la logica del juego corre completamente onchain via Dojo.

> **Demo en Sepolia**: todo funcional excepto la lectura de bestias de mainnet — usa bestias de prueba predefinidas. Crea configuraciones de juego via EGS, juega 1v1 con amigos y explora configuraciones personalizadas.

---

## Tabla de Contenidos

- [Objetivo](#objetivo)
- [Como encaja en el ecosistema](#como-encaja-en-el-ecosistema)
- [De donde vienen las bestias?](#de-donde-vienen-las-bestias)
- [Flujo de juego](#flujo-de-juego)
- [El tablero](#el-tablero)
- [Triangulo de combate](#triangulo-de-combate)
- [Formula de dano](#formula-de-dano)
- [Contraataque](#contraataque)
- [Tipos de bestias y subclases](#tipos-de-bestias-y-subclases)
- [Restricciones de equipo y configuracion](#restricciones-de-equipo-y-configuracion)
- [Matchmaking y ranking](#matchmaking-y-ranking)
- [Partidas amistosas](#partidas-amistosas)
- [Integracion EGS (Torneos Budokan)](#integracion-egs-torneos-budokan)
- [Denshokan](#denshokan)
- [Integraciones del ecosistema](#integraciones-del-ecosistema)
- [Inicio rapido (Local)](#inicio-rapido-local)
- [Demo Sepolia](#demo-sepolia)
- [Stack](#stack)

---

## Objetivo

Elimina las 3 bestias de tu oponente. Cada partida es un 1v1 en una grilla hexagonal donde el posicionamiento, las ventajas de tipo y las habilidades de subclase determinan el resultado. Gana partidas en matchmaking ranked para escalar en el leaderboard — el sistema de puntaje funciona como una liga, impulsado por el Embeddable Game Standard (EGS).

---

## Como encaja en el ecosistema

Tactical Beasts es la capa de combate tactico del ecosistema Provable Games:

```
Loot Survivor (jugar) --> Ganar bestias y tokens
         |
         v
    Beast NFTs (ERC721 en Starknet mainnet)
         |
    +----+----+
    |         |
    v         v
 Summit    Tactical Beasts (este juego)
 (PvP)    (tactica en grilla)
    |         |
    +----+----+
         |
         v
    Torneos Budokan (via EGS)
```

- **Loot Survivor / Death Mountain**: define las 75 especies de bestias, 3 tipos, 5 tiers, el triangulo de combate y la formula de dano. Tactical Beasts hereda todo esto.
- **Beast NFTs**: los jugadores usan las bestias ERC721 reales que poseen en Starknet. La propiedad se valida tanto en contratos como en el frontend.
- **Summit**: el juego king-of-the-hill que comparte las mismas bestias. Mejora bestias ahi, batallalas aca.
- **Budokan**: Tactical Beasts implementa EGS, asi que esta listo para torneos. Las partidas ranked generan puntajes para leaderboards automaticos y distribucion de premios.

---

## De donde vienen las bestias?

Las bestias son **NFTs ERC721** minteados a traves del gameplay de Loot Survivor en Starknet. Cada bestia tiene una especie (1-75), tipo (Magical/Hunter/Brute), tier (T1-T5), nivel y salud — todo almacenado onchain.

- **En mainnet**: el juego lee tus beast NFTs reales del contrato Beasts (`0x046da8...`). Nadie puede jugar con una bestia que no posee — validado onchain.
- **En Sepolia/local**: tenemos 2 bestias predefinidas por especie (150 en total) para testing. Estas permiten que cualquiera pruebe el juego sin necesitar NFTs de mainnet.
- **Bestias por defecto**: los jugadores que no poseen NFTs pueden probar el juego usando un set de bestias T4 por defecto, asi nadie queda afuera.

Podes ver tus token IDs en la interfaz del juego.

---

## Flujo de juego

### 1. Encontrar partida

Dos opciones:
- **Matchmaking**: entra a la cola y seras emparejado con otro jugador. Las partidas ranked cuentan para el leaderboard.
- **Invitar a un amigo**: busca por nombre de Controller, agrega como amigo y envia una invitacion. Estas partidas NO cuentan para el ranking.

### 2. Seleccionar equipo (30 segundos)

- Tenes **30 segundos** para elegir tus 3 bestias de tu coleccion.
- **Auto-confirm**: si se acaba el tiempo, el juego auto-selecciona bestias por defecto o completa tu equipo con defaults.
- El juego **recuerda tu ultima seleccion** para mejor UX — la proxima vez que entres a la cola, tus 3 bestias anteriores estan pre-seleccionadas.

### 3. Lanzamiento de moneda

Un lanzamiento de moneda determina quien va primero. Se calcula como `(timestamp + game_id) % 2 + 1` — pseudo-random pero deterministico y verificable onchain.

### 4. Batalla (por turnos)

Cada turno:
1. El jugador activo **planifica acciones para TODAS sus bestias** (hasta una accion por bestia: mover, atacar o saltar).
2. Una vez confirmado, **todas las acciones se ejecutan juntas**.
3. Luego el otro jugador toma su turno.

Esto NO es alternar acciones de bestias individuales — es **todas tus bestias actuan, luego todas las suyas**. Podes elegir no hacer nada con algunas bestias. No todas las acciones son obligatorias.

### 5. Victoria

La partida termina cuando las 3 bestias de un lado son eliminadas. Las estadisticas, kills y puntaje se registran onchain.

---

## El tablero

- Grilla hexagonal con 7 filas: `[6, 7, 8, 7, 8, 7, 6]` = 49 celdas.
- **6 obstaculos** generados aleatoriamente por partida.
- Posiciones de spawn fijas: Jugador 1 a la izquierda, Jugador 2 a la derecha.
- El movimiento usa distancia hexagonal (conversion offset-a-cubo) — no se puede hacer trampa con diagonales.

---

## Triangulo de combate

Heredado de Death Mountain / Loot Survivor:

```
     Magical
    /       \
   /  fuerte  \
  v            |
Brute -------> Hunter
      fuerte
```

- **Magical > Brute**: +50% de dano
- **Brute > Hunter**: +50% de dano
- **Hunter > Magical**: +50% de dano
- Matchups inversos: -50% de dano
- Mismo tipo: neutral

Es el mismo triangulo de armas de Loot Survivor (Magic/Cloth > Bludgeon/Metal > Blade/Hide > Magic/Cloth) aplicado a tipos de bestias.

---

## Formula de dano

Usa la formula de combate de Death Mountain:

```
Dano Base = Nivel x (6 - Tier)
```

| Tier | Multiplicador | Ejemplo (Nivel 10) |
|------|:-------------:|:-------------------:|
| T1   | x5            | 50 de dano          |
| T2   | x4            | 40 de dano          |
| T3   | x3            | 30 de dano          |
| T4   | x2            | 20 de dano          |
| T5   | x1            | 10 de dano          |

---

## Contraataque

Cuando atacas a una bestia enemiga y **sobrevive**, automaticamente contraataca. El contra hace **20% de su dano normal de ataque** de vuelta a tu bestia. Este contra puede matar a tu atacante.

---

## Tipos de bestias y subclases

Cada uno de los 3 tipos de bestias (Magical, Hunter, Brute) tiene **2 subclases** con roles, rangos de movimiento, rangos de ataque y habilidades pasivas unicos:

### Magical (IDs 1-25)

Poca HP, mucho dano. Atacantes a distancia.

| Subclase | Rol | Mov | Rango de Ataque | Pasiva |
|----------|-----|:---:|:---------------:|--------|
| **Warlock** | Cristal de cañon | 2 | 3 | **Siphon** — cura 15% del dano infligido |
| **Enchanter** | Soporte | 2 | 2 | **Regen** — comienza con +8% de HP maxima |

### Hunter (IDs 26-50)

Stats medios. Mezcla de asesinos cuerpo a cuerpo y francotiradores de largo alcance.

| Subclase | Rol | Mov | Rango de Ataque | Pasiva |
|----------|-----|:---:|:---------------:|--------|
| **Stalker** | Asesino | 3 | 1 (cuerpo a cuerpo) | **First Strike** — +15% de dano vs objetivos con HP completa |
| **Ranger** | Francotirador | 2 | 4 | **Exposed** — recibe +30% de dano de enemigos adyacentes |

### Brute (IDs 51-75)

Mucha HP, peleadores cuerpo a cuerpo. Tanques y brawlers.

| Subclase | Rol | Mov | Rango de Ataque | Pasiva |
|----------|-----|:---:|:---------------:|--------|
| **Juggernaut** | Tanque | 2 | 1 (cuerpo a cuerpo) | **Fortify** — -10% de dano recibido si no se movio el turno anterior |
| **Berserker** | Luchador | 2 | 1 (cuerpo a cuerpo) | **Rage** — +12% de dano cuando esta por debajo del 50% de HP |

### Habilidades pasivas explicadas

| Pasiva | Subclase | Efecto | Cuando |
|--------|----------|--------|--------|
| **Siphon** | Warlock | Cura 15% del dano infligido | Al atacar |
| **Regen** | Enchanter | +8% de HP bonus | Al crear la bestia (permanente) |
| **First Strike** | Stalker | +15% de dano bonus | Cuando el objetivo tiene 100% de HP |
| **Exposed** | Ranger | Recibe +30% de dano extra | Cuando el enemigo esta adyacente (1 hex) — esto es una desventaja |
| **Fortify** | Juggernaut | -10% de dano recibido | Si el Juggernaut no se movio en su ultimo turno |
| **Rage** | Berserker | +12% de dano bonus | Cuando esta por debajo del 50% de HP |

### Notas tacticas

- **Stalker** es la unica subclase con 3 de movimiento — el asesino que cierra distancias rapido y castiga objetivos frescos.
- **Ranger** tiene el mayor rango de ataque (4) pero Exposed lo convierte en cristal de canon a corta distancia. Mantene la distancia.
- **Warlock** se sustenta con Siphon pero tiene poca HP — pega fuerte y recupera vida.
- **Juggernaut** recompensa mantener posicion. Movete a posicion y quedate quieto para la reduccion de dano.
- **Berserker** se vuelve mas fuerte al recibir dano — peligroso dejarlo vivo con poca HP.
- **Enchanter** tiene una ventaja plana de HP desde el inicio gracias a Regen, haciendolo la bestia magical mas duradera.

---

## Restricciones de equipo y configuracion

### Reglas por defecto (Ranked)

| Regla | Valor | Razon |
|-------|-------|-------|
| Tiers permitidos | T2, T3, T4 | T1 legendarios y T5 comunes excluidos por balance |
| Maximo T2 por equipo | 1 | Previene acumular bestias raras |
| Maximo T3 por equipo | 2 | Composicion balanceada |
| Limite T4 | Ninguno | Disponible libremente |
| Tamanio de equipo | 3 bestias | - |

### Configuracion personalizada (Partidas amistosas)

Al jugar con amigos, crea configuraciones personalizadas que modifican:

| Parametro | Descripcion | Default |
|-----------|-------------|---------|
| `min_tier` / `max_tier` | Rango de tiers permitidos | T2-T4 |
| `max_t2_per_team` | Maximo de bestias T2 por jugador | 1 |
| `max_t3_per_team` | Maximo de bestias T3 por jugador | 2 |
| `beasts_per_player` | Tamanio del equipo | 3 |

Las configuraciones personalizadas se guardan onchain con un `settings_id`. Podes crearlas y reutilizarlas. Proximamente: crear **torneos** Budokan con estas configuraciones personalizadas, impulsados por EGS.

---

## Matchmaking y ranking

### Matchmaking

Sistema simple basado en cola. Entra a la cola, seras emparejado con el siguiente oponente disponible. Resolucion completamente onchain.

### Formula de ranking

Las partidas de matchmaking ranked contribuyen a un leaderboard estilo liga. La formula de puntaje:

```
Puntaje = (victorias x 500) + (kills x 50) + (bestias_vivas x 30)
```

| Componente | Puntos | Recompensa |
|------------|:------:|------------|
| Victoria | 500 | Ganar la partida |
| Kill | 50 | Cada bestia enemiga eliminada |
| Bestia viva | 30 | Cada una de tus bestias que sobrevive |

Esto crea un ranking de liga donde la consistencia importa — tanto ganar como ganar eficientemente (mas kills, menos perdidas) son recompensados.

**Estadisticas trackeadas por jugador**: partidas jugadas, victorias, derrotas, kills totales, muertes totales, abandonos.

---

## Partidas amistosas

Juega con amigos sin afectar tu ranking:

1. **Agregar amigos**: busca por nombre de Controller y envia una solicitud de amistad.
2. **Invitar a partida**: una vez aceptada, envia una invitacion de juego.
3. **Reglas personalizadas**: opcionalmente usa una configuracion `GameSettings` personalizada (diferentes tiers, tamanios de equipo, topes).
4. **Sin impacto en ranking**: las partidas amistosas se excluyen del puntaje EGS y las estadisticas del perfil.

Notificaciones en tiempo real para solicitudes de amistad e invitaciones de juego via suscripciones de Supabase.

---

## Integracion EGS (Torneos Budokan)

Tactical Beasts implementa el [Embeddable Game Standard](https://github.com/Provable-Games/game-components) (`IMinigameTokenData` + `IMinigameSettings`), haciendolo completamente compatible con [Budokan](https://docs.provable.games/budokan), el framework de torneos onchain.

### Como funciona

- **NFT por sesion**: cada jugador recibe un token ERC721 cuando empieza una partida (minteado via EGS `minigame.mint()`).
- **`game_over(token_id)`**: devuelve `true` cuando la partida termino.
- **`settings_exist(settings_id)`**: valida la configuracion del juego para la configuracion del torneo.

### `score(token_id)` — La vuelta para un juego PvP

Budokan y EGS fueron disenados originalmente para juegos **PvE** (como Loot Survivor), donde un solo jugador juega y obtiene un score al final de su sesion. En esos juegos, `score(token_id)` simplemente devuelve el puntaje de esa partida individual.

**El desafio con PvP**: en un juego 1v1, una sola partida no captura bien el rendimiento de un jugador. Un score por partida individual no sirve para un sistema competitivo — necesitas un acumulado.

**Nuestra solucion**: cada token acumula stats tipo liga (KD — kills y deaths) a lo largo de multiples partidas ranked. El `score(token_id)` devuelve un **score acumulativo** basado en el rendimiento historico del token:

```
score = (wins x 500) + (kills x 50) + (beasts_alive x 30)
```

El modelo `TokenScore` trackea por token: `wins`, `losses`, `kills`, `deaths`, `beasts_alive`, `matches_played`. Esto convierte a Tactical Beasts en un sistema de **liga** donde el score refleja rendimiento sostenido, no una partida aislada.

**En resumen**: adaptamos EGS (pensado para PvE) a un juego PvP haciendo que el token funcione como un "pase de temporada" que acumula KD.

### Que habilita esto

- Torneos automatizados de Budokan con partidas de Tactical Beasts.
- Distribucion de premios basada en puntajes del leaderboard onchain.
- Formatos de torneo personalizados usando diferentes `GameSettings`.
- **Estamos listos para torneos** — cualquier organizador de Budokan puede crear un torneo de Tactical Beasts hoy.

Las partidas amistosas se excluyen del puntaje EGS.

---

## Denshokan


- Minteo de tokens y gestion de metadata.
- Envio de puntajes al leaderboard rankeable.
- Actualizaciones de metadata ERC4906 en eventos del juego.

---

## Integraciones del ecosistema

| Integracion | Que | Donde |
|---|---|---|
| **Death Mountain** | Formula de dano (`Nivel x (6-Tier)`), triangulo de combate (+-50%), dano minimo | `contracts/src/logic/combat.cairo` |
| **Loot Survivor Beasts** | 75 especies en 3 tipos x 5 tiers, validacion de propiedad NFT ERC721 | Summit API + `beasts-all.json` |
| **EGS (game-components)** | `IMinigameTokenData`, `IMinigameSettings`, NFTs de sesion, score/game_over | `contracts/src/systems/game_system.cairo` |
| **Budokan** | Listo para torneos via integracion EGS | Leaderboard + envio de puntaje |
| **Summit API** | Obtener beast NFTs del jugador para seleccion de equipo | `src/hooks/useOwnedBeasts.ts` |
| **Cartridge Controller** | Auth de wallet, session keys (usado en Sepolia/mainnet; burners localmente) | `src/dojo/controller/` |
| **Denshokan SDK** | Minteo de tokens, tracking de puntaje, metadata (pendiente: addresses de mainnet) | `src/config/denshokan.ts` |
| **Supabase** | Sistema de amigos, invitaciones de juego, notificaciones en tiempo real | `src/services/supabase.ts` |

---

## Las 75 bestias

Todas las bestias vienen de Loot Survivor. El tier determina el poder base, el tipo determina la ventaja de combate:

### Magical (IDs 1-25)

| Tier | Bestias |
|------|---------|
| T1 | Warlock, Typhon, Jiangshi, Anansi, Basilisk |
| T2 | Gorgon, Kitsune, Lich, Chimera, Wendigo |
| T3 | Rakshasa, Werewolf, Banshee, Draugr, Vampire |
| T4 | Goblin, Ghoul, Wraith, Sprite, Kappa |
| T5 | Fairy, Leprechaun, Kelpie, Pixie, Gnome |

### Hunter (IDs 26-50)

| Tier | Bestias |
|------|---------|
| T1 | Griffin, Manticore, Phoenix, Dragon, Minotaur |
| T2 | Qilin, Ammit, Nue, Skinwalker, Chupacabra |
| T3 | Weretiger, Wyvern, Roc, Harpy, Pegasus |
| T4 | Hippogriff, Fenrir, Jaguar, Satori, DireWolf |
| T5 | Bear, Wolf, Mantis, Spider, Rat |

### Brute (IDs 51-75)

| Tier | Bestias |
|------|---------|
| T1 | Kraken, Colossus, Balrog, Leviathan, Tarrasque |
| T2 | Titan, Nephilim, Behemoth, Hydra, Juggernaut |
| T3 | Oni, Jotunn, Ettin, Cyclops, Giant |
| T4 | NemeanLion, Berserker, Yeti, Golem, Ent |
| T5 | Troll, Bigfoot, Ogre, Orc, Skeleton |

> Recordar: T1 y T5 estan **excluidos** de Tactical Beasts por balance. Solo las bestias T2-T4 son jugables.

---

## Inicio rapido (Local)

El desarrollo local usa burner wallets prefondeadas — no se necesita Controller.

```bash
# Instalar dependencias
npm install --legacy-peer-deps

# Iniciar nodo local de Starknet
make katana

# Compilar contratos, migrar, generar bindings, iniciar indexador Torii
make setup

# Iniciar servidor de desarrollo frontend
make dev
```

### Sepolia

```bash
make dev-sepolia
```

Usa Cartridge Controller para auth de wallet. Bestias de prueba predefinidas (2 por especie) en vez de NFTs de mainnet.

### Mainnet

```bash
make dev-mainnet
```

Experiencia completa: lee tus beast NFTs reales de Starknet mainnet. Controller para auth.

---

## Demo Sepolia

El deploy en Sepolia tiene todo funcionando:

- Cola de matchmaking y juego ranked.
- Sistema de amigos con busqueda por nombre de Controller.
- Configuraciones de juego personalizadas via EGS.
- Seleccion de equipo con validacion de tiers.
- Flujo de batalla completo con grilla hexagonal, pasivas, contraataques.
- Leaderboard con puntaje estilo liga.
- Ver token IDs de todos los jugadores.

**Todavia no en Sepolia**: lectura de beast NFTs desde mainnet. Usa las 150 bestias de prueba predefinidas (2 por especie) en su lugar.

---

## Stack

Dojo 1.8.x · Cairo 2.15.x · React 18 · Chakra UI · Starknet.js · Cartridge Controller · Torii · Supabase · Denshokan SDK
