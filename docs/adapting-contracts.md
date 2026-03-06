# Adaptar a tus contratos

Esta guia explica como conectar tus propios contratos Cairo/Dojo al template.

## Paso 1: Compilar contratos con Sozo

En tu proyecto de contratos Cairo:

```bash
sozo build
```

Esto genera un `manifest.json` con la metadata de todos tus sistemas y modelos.

## Paso 2: Copiar manifest

```bash
cp manifest.json /ruta/a/dojo-starter-react/manifest_slot.json
```

## Paso 3: Generar bindings TypeScript

```bash
cd dojo-starter-react
npx @dojoengine/core generate \
  --manifest ./manifest_slot.json \
  --output ./src/dojo/typescript
```

Esto genera tres archivos:

### `contracts.gen.ts`
Funciones tipadas para cada sistema. Ejemplo:

```ts
// Para un sistema "game_system" con funcion "spawn"
const game_system_spawn = async (
  snAccount: Account | AccountInterface,
  name: BigNumberish
) => {
  return await provider.execute(
    snAccount,
    { contractName: "game_system", entrypoint: "spawn", calldata: [name] },
    "mi_namespace"   // <-- esto hay que reemplazar
  );
};
```

### `defineContractComponents.ts`
Definiciones RECS para cada modelo:

```ts
Player: defineComponent(world, {
  address: RecsType.BigInt,
  name: RecsType.String,
  score: RecsType.Number,
}, { metadata: { namespace: "mi_namespace", name: "Player", ... } })
```

### `models.gen.ts`
Interfaces TypeScript:

```ts
export interface Player {
  address: string;
  name: string;
  score: number;
}
```

## Paso 4: Fix del namespace

El generador hardcodea el namespace como string literal. Hay que reemplazarlo para que sea configurable via env.

En `src/dojo/typescript/contracts.gen.ts`:

**Agregar al inicio del archivo:**
```ts
const DOJO_NAMESPACE = import.meta.env.VITE_DOJO_NAMESPACE || "tu_namespace";
```

**Buscar y reemplazar** todas las instancias de `"tu_namespace"` (el string literal) por `DOJO_NAMESPACE`.

Ejemplo:
```ts
// ANTES (generado)
return await provider.execute(snAccount, calldata, "mi_namespace");

// DESPUES (corregido)
return await provider.execute(snAccount, calldata, DOJO_NAMESPACE);
```

> Hacer lo mismo en `defineContractComponents.ts` si el namespace aparece hardcodeado.

## Enums y constantes de Cairo

El generador de bindings (`npm run generate` / `make setup`) solo genera **interfaces** para los structs de Cairo, pero **no genera enums** ni constantes. Si tus contratos usan constantes `u8` para representar estados (como `GameStatus` o `Move`), tenés que definir esos enums manualmente en TypeScript.

**Problema:** Si los agregás directamente en `models.gen.ts`, se pierden cada vez que ejecutás `make setup` porque el archivo se regenera.

**Solucion:** Crear un archivo separado `src/dojo/constants.ts` que no sea tocado por el generador:

```ts
// src/dojo/constants.ts
// Matching Cairo constants from contracts/src/constants.cairo
// This file is NOT auto-generated — safe from `npm run generate` overwrites.

export enum GameStatus {
  WAITING = 0,
  COMMITTING = 1,
  REVEALING = 2,
  FINISHED = 3,
}

export enum Move {
  NONE = 0,
  ROCK = 1,
  PAPER = 2,
  SCISSORS = 3,
}
```

Luego importar desde ahí en vez de `models.gen.ts`:

```ts
// En tus pages/components
import { GameStatus, Move } from "../dojo/constants";
```

> Siempre que agregues nuevas constantes o enums en Cairo, reflejalos manualmente en `src/dojo/constants.ts`.

## Paso 5: Usar los bindings

### Write (ejecutar transaccion)

```tsx
import { useDojo } from "../dojo/DojoContext";

function MyComponent() {
  const {
    setup: { client },
    account: { account },
  } = useDojo();

  const handleSpawn = async () => {
    // Ejecutar transaccion
    const response = await client.game_system.spawn(account, "PlayerOne");

    // Esperar confirmacion
    const txHash = response?.transaction_hash ?? "";
    const receipt = await account.waitForTransaction(txHash, {
      retryInterval: 100,
    });

    // Verificar exito
    if (receipt.isSuccess()) {
      console.log("Spawn exitoso!");
      // Parsear eventos si es necesario:
      // receipt.value.events
    }
  };

  return <button onClick={handleSpawn}>Spawn</button>;
}
```

### Write con useContractActions (manejo de loading/error)

```tsx
import { useDojo } from "../dojo/DojoContext";
import { useContractActions } from "../hooks/useContractActions";

function MyComponent() {
  const { setup: { client }, account: { account } } = useDojo();
  const { execute, isLoading, error } = useContractActions();

  const handleSpawn = async () => {
    const result = await execute(client.game_system.spawn, [account, "PlayerOne"]);
    if (result) {
      console.log("TX enviada:", result);
    }
  };

  return (
    <button onClick={handleSpawn} disabled={isLoading}>
      {isLoading ? "Enviando..." : "Spawn"}
    </button>
  );
}
```

### Read (view call, sin gas)

```tsx
const data = await client.game_system.getPlayerData(playerAddress);
console.log("Player data:", data);
```

### GraphQL (queries a Torii)

```tsx
import graphQLClient from "../graphQLClient";
import { gql } from "graphql-tag";

const GET_PLAYERS = gql`
  query GetPlayers($first: Int) {
    mi_namespacePlayerModels(first: $first) {
      edges {
        node {
          address
          name
          score
        }
      }
    }
  }
`;

async function fetchPlayers() {
  const result = await graphQLClient.request(GET_PLAYERS, { first: 100 });
  return result.mi_namespacePlayerModels.edges.map((e) => e.node);
}
```

> El nombre del query en GraphQL sigue el formato `{namespace}{ModelName}Models`.

## Paso 6: Crear paginas

Agregar un nuevo archivo en `src/pages/`:

```tsx
// src/pages/GamePage.tsx
import { Box, Heading } from "@chakra-ui/react";
import { useDojo } from "../dojo/DojoContext";

export function GamePage() {
  const { setup: { client }, account: { account, accountDisplay } } = useDojo();

  return (
    <Box p={8}>
      <Heading>Game</Heading>
      <p>Connected as: {accountDisplay}</p>
      {/* Tu UI aqui */}
    </Box>
  );
}
```

Registrar la ruta en `src/AppRoutes.tsx`:

```tsx
import { GamePage } from "./pages/GamePage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/game" element={<GamePage />} />  {/* nueva ruta */}
    </Routes>
  );
}
```

## Flujo completo: ejemplo end-to-end

Supongamos que tienes un contrato con:
- Sistema: `counter_system`
- Funciones: `increment(amount)`, `get_count() -> u32`
- Modelo: `Counter { player: felt252, value: u32 }`

### 1. Generar bindings
```bash
npx @dojoengine/core generate --manifest ./manifest_slot.json --output ./src/dojo/typescript
```

### 2. Fix namespace en `contracts.gen.ts`

### 3. Crear pagina

```tsx
// src/pages/CounterPage.tsx
import { Button, Heading, Text, VStack } from "@chakra-ui/react";
import { useState } from "react";
import { useDojo } from "../dojo/DojoContext";

export function CounterPage() {
  const { setup: { client }, account: { account } } = useDojo();
  const [count, setCount] = useState<number | null>(null);

  const handleIncrement = async () => {
    const response = await client.counter_system.increment(account, 1);
    const txHash = response?.transaction_hash ?? "";
    await account.waitForTransaction(txHash, { retryInterval: 100 });
    // Refetch count
    handleRead();
  };

  const handleRead = async () => {
    const result = await client.counter_system.getCount();
    setCount(Number(result));
  };

  return (
    <VStack p={8} gap={4}>
      <Heading>Counter</Heading>
      <Text fontSize="4xl">{count ?? "?"}</Text>
      <Button onClick={handleIncrement} colorScheme="blue">+1</Button>
      <Button onClick={handleRead} variant="outline">Refresh</Button>
    </VStack>
  );
}
```

### 4. Agregar ruta y listo
