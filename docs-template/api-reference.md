# API Reference

## Hooks

### `useDojo()`

Hook principal para interactuar con Dojo. Disponible en cualquier componente dentro del `DojoProvider`.

**Ubicacion:** `src/dojo/DojoContext.tsx` y `src/dojo/useDojo.tsx`

```tsx
const {
  setup,        // SetupResult completo
  account,      // DojoAccount (cuenta activa + utilidades)
  masterAccount,// Account master (solo desde DojoContext.tsx)
  switchToController, // funcion para cambiar a controller
  accountType,  // "burner" | "controller" | null
  logout,       // funcion para desconectar
} = useDojo();
```

#### `setup`

| Propiedad | Tipo | Descripcion |
|-----------|------|-------------|
| `client` | `ReturnType<setupWorld>` | Funciones tipadas para cada sistema del contrato |
| `clientComponents` | `ClientComponents` | Componentes RECS del cliente |
| `contractComponents` | `ContractComponents` | Componentes RECS del contrato |
| `systemCalls` | `SystemCalls` | System calls personalizados |
| `config` | `DojoConfig` | Configuracion de Dojo |
| `dojoProvider` | `DojoProvider` | Provider para ejecutar transacciones |
| `burnerManager` | `BurnerManager` | Manager de burner accounts |
| `toriiClient` | `ToriiClient` | Cliente del indexer Torii |
| `publish` | `(typedData, signature) => void` | Publicar mensajes firmados |

#### `account`

| Propiedad | Tipo | Descripcion |
|-----------|------|-------------|
| `account` | `Account \| AccountInterface` | Cuenta activa (firma transacciones) |
| `accountDisplay` | `string` | Direccion abreviada (`0x1234...abcd`) |
| `isDeploying` | `boolean` | Si el burner se esta deployando |
| `create` | `() => void` | Crear nuevo burner |
| `list` | `() => any[]` | Listar burners disponibles |
| `get` | `(id: string) => any` | Obtener burner por ID |
| `select` | `(id: string) => void` | Seleccionar burner activo |
| `clear` | `() => void` | Limpiar burners |

---

### `useWallet()`

Hook para acceder al estado de autenticacion. Disponible en cualquier componente dentro del `WalletProvider`.

**Ubicacion:** `src/dojo/WalletContext.tsx`

```tsx
const {
  finalAccount,          // Account activa o null
  accountType,           // "burner" | "controller" | null
  switchToController,    // iniciar conexion con Controller
  logout,                // desconectar y limpiar estado
  isLoadingWallet,       // si esta en proceso de conexion
  connectionStatus,      // "selecting" | "connecting_burner" | "connecting_controller"
  setConnectionStatus,   // cambiar estado de conexion
  connectAsGuest,        // conectar como invitado (crea burner)
  burnerAccount,         // cuenta burner (puede ser null)
  controllerAccount,     // cuenta controller (puede ser null)
  isControllerConnected, // si el controller esta conectado
  isControllerConnecting,// si esta conectando
  onSuccessCallback,     // ref al callback de exito
} = useWallet();
```

---

### `useContractActions()`

Hook generico para ejecutar transacciones con manejo de loading y errores.

**Ubicacion:** `src/hooks/useContractActions.ts`

```tsx
const { execute, isLoading, error } = useContractActions();

// Uso
const result = await execute(
  client.mi_sistema.mi_funcion,  // funcion a ejecutar
  [account, arg1, arg2]          // argumentos
);
```

| Propiedad | Tipo | Descripcion |
|-----------|------|-------------|
| `execute` | `(fn, args) => Promise<T \| null>` | Ejecuta la funcion y captura errores |
| `isLoading` | `boolean` | `true` mientras la transaccion esta en curso |
| `error` | `Error \| null` | Ultimo error, o `null` si fue exitosa |

---

## Stores

### `useAccountStore`

Store Zustand para la cuenta activa. Se actualiza automaticamente desde `DojoContext`.

**Ubicacion:** `src/dojo/accountStore.tsx`

```tsx
import { useAccountStore } from "../dojo/accountStore";

// Leer cuenta
const account = useAccountStore((s) => s.account);

// Setear cuenta (uso interno)
useAccountStore.getState().setAccount(newAccount);
```

| Propiedad | Tipo | Descripcion |
|-----------|------|-------------|
| `account` | `Account \| AccountInterface \| null` | Cuenta activa |
| `setAccount` | `(account) => void` | Setear cuenta |
| `connector` | `ControllerConnector \| null` | Conector activo |
| `setConnector` | `(connector) => void` | Setear conector |

---

## Cliente GraphQL

### `graphQLClient`

Instancia de `GraphQLClient` preconfigurada con el endpoint de Torii.

**Ubicacion:** `src/graphQLClient.ts`

```tsx
import graphQLClient from "../graphQLClient";
import { gql } from "graphql-tag";

const query = gql`
  query {
    entities(first: 10) {
      totalCount
    }
  }
`;

const result = await graphQLClient.request(query);
```

El endpoint se resuelve automaticamente:
- **Con Slot:** `https://api.cartridge.gg/x/{instance}/torii/graphql`
- **Local:** `http://localhost:8080/graphql`

---

## Utilidades

### `displayAddress(address: string): string`

Abrevia una direccion hex: `"0x1234567890abcdef"` -> `"0x1234...cdef"`

**Ubicacion:** `src/dojo/DojoContext.tsx`

### `getSlotChainId(slot: string): string`

Genera el chain ID para un Slot instance: `"my-app"` -> encoded `"WP_MY_APP"`

**Ubicacion:** `src/dojo/controller/controller.ts`

---

## Tipos principales

### `SetupResult`

Tipo retornado por `setup()`. Contiene todo lo necesario para interactuar con Dojo.

```ts
type SetupResult = {
  client: ReturnType<typeof setupWorld>;
  clientComponents: ClientComponents;
  contractComponents: ContractComponents;
  systemCalls: SystemCalls;
  publish: (typedData: string, signature: ArraySignatureType) => void;
  config: DojoConfig;
  dojoProvider: DojoProvider;
  burnerManager: BurnerManager;
  toriiClient: ToriiClient;
};
```

### `DojoResult`

Tipo retornado por `useDojo()`.

```ts
interface DojoResult {
  setup: DojoContextType;    // SetupResult + account info
  account: DojoAccount;      // Cuenta activa
  masterAccount: Account;    // Cuenta master
}
```
