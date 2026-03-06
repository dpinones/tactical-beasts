# Arquitectura

## Diagrama general

```
Browser
  |
  v
index.html
  |
  v
main.tsx ── setup(dojoConfig) ──> ToriiClient + DojoProvider + BurnerManager
  |
  v
┌──────────────────────────────────────────────────┐
│ StarknetProvider                                 │
│  ┌──────────────────────────────────────────────┐│
│  │ QueryClientProvider                          ││
│  │  ┌──────────────────────────────────────────┐││
│  │  │ ChakraBaseProvider                       │││
│  │  │  ┌──────────────────────────────────────┐│││
│  │  │  │ WalletProvider                       ││││
│  │  │  │  ┌──────────────────────────────────┐││││
│  │  │  │  │ DojoProvider                     │││││
│  │  │  │  │  ┌──────────────────────────────┐│││││
│  │  │  │  │  │ BrowserRouter                ││││││
│  │  │  │  │  │  ┌────────────────────────┐  ││││││
│  │  │  │  │  │  │ App > AppRoutes        │  ││││││
│  │  │  │  │  │  │  / ──> HomePage        │  ││││││
│  │  │  │  │  │  │  /demo ──> DemoPage    │  ││││││
│  │  │  │  │  │  └────────────────────────┘  ││││││
│  │  │  │  │  └──────────────────────────────┘│││││
│  │  │  │  └──────────────────────────────────┘││││
│  │  │  └──────────────────────────────────────┘│││
│  │  └──────────────────────────────────────────┘││
│  └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

## Flujo de inicializacion

1. `main.tsx` llama a `setup(dojoConfig)`
2. `setup()` inicializa:
   - `ToriiClient` — conexion al indexer Torii
   - `DojoProvider` — ejecuta transacciones contra contratos
   - `BurnerManager` — crea/administra burner accounts
   - `setupWorld()` — genera funciones tipadas para cada sistema del contrato
3. El resultado (`SetupResult`) se pasa a `WalletProvider` y `DojoProvider`
4. La app renderiza `HomePage` (login) o `DemoPage` (si ya hay cuenta activa)

## Capas de la aplicacion

### 1. Config (`src/config/`)

Resolucion de endpoints a partir de variables de entorno.

```
VITE_SLOT_INSTANCE=my-app
  -> rpcUrl:     https://api.cartridge.gg/x/my-app/katana
  -> toriiUrl:   https://api.cartridge.gg/x/my-app/torii
  -> graphqlUrl: https://api.cartridge.gg/x/my-app/torii/graphql

Sin VITE_SLOT_INSTANCE (local):
  -> rpcUrl:     http://localhost:5050
  -> toriiUrl:   http://localhost:8080
  -> graphqlUrl: http://localhost:8080/graphql
```

### 2. Dojo (`src/dojo/`)

Core de la integracion blockchain. Contiene:

| Archivo | Responsabilidad |
|---------|-----------------|
| `setup.ts` | Inicializa todos los clientes y managers |
| `DojoContext.tsx` | Contexto React que expone `client`, `account`, etc. |
| `WalletContext.tsx` | Estado de autenticacion (controller vs burner) |
| `accountStore.tsx` | Store Zustand para la cuenta activa |
| `useDojo.tsx` | Hook principal para acceder al contexto |
| `world.ts` | Instancia del world RECS |
| `createClientComponents.ts` | Extiende los componentes del contrato |
| `createSystemCalls.tsx` | System calls personalizados (vacio por default) |
| `getManifest.ts` | Carga el manifest local |

### 3. Controller (`src/dojo/controller/`)

Configuracion del conector de Cartridge Controller.

| Archivo | Responsabilidad |
|---------|-----------------|
| `controller.ts` | Instancia de `ControllerConnector` con config de chain |
| `policies.ts` | Auto-genera policies desde el manifest para session keys |
| `constants.ts` | Direccion del VRF provider |

### 4. TypeScript generado (`src/dojo/typescript/`)

Archivos generados por `npm run generate`. Contienen:

- `contracts.gen.ts` — funciones tipadas para cada sistema (execute + call)
- `defineContractComponents.ts` — definiciones RECS para cada modelo
- `models.gen.ts` — interfaces TypeScript de los modelos

### 5. Providers (`src/providers/`)

| Provider | Responsabilidad |
|----------|-----------------|
| `StarknetProvider` | Configura starknet-react con el chain correcto y el controller como conector |

### 6. Paginas (`src/pages/`)

| Pagina | Ruta | Descripcion |
|--------|------|-------------|
| `HomePage` | `/` | Login con Controller o Guest |
| `DemoPage` | `/demo` | Ejemplos de write, read y GraphQL |

## Flujo de datos

### Escritura (Write Transaction)

```
Componente
  -> useDojo() -> setup.client.mi_sistema.mi_funcion(account, args)
    -> DojoProvider.execute(account, calldata, namespace)
      -> RPC call a Katana
        -> Contrato Cairo ejecuta logica
          -> Evento emitido
            -> Torii indexa el cambio
```

### Lectura (View Call)

```
Componente
  -> useDojo() -> setup.client.mi_sistema.get_valor(args)
    -> DojoProvider.call(contractName, calldata)
      -> RPC call a Katana (no gas, no firma)
        -> Retorna datos
```

### Lectura (GraphQL via Torii)

```
Componente
  -> graphQLClient.request(query)
    -> HTTP POST a toriiUrl/graphql
      -> Torii responde con datos indexados
```

## Variables de entorno

| Variable | Obligatoria | Descripcion |
|----------|-------------|-------------|
| `VITE_SLOT_INSTANCE` | No | Nombre del deployment en Cartridge Slot |
| `VITE_DOJO_NAMESPACE` | Si | Namespace de los contratos Dojo |
| `VITE_MASTER_ADDRESS` | Si | Direccion de la cuenta master (para crear burners) |
| `VITE_MASTER_PRIVATE_KEY` | Si | Clave privada de la cuenta master |
| `VITE_ENV` | No | Entorno (`slot`, `local`, `dev`) |
| `VITE_CHAIN` | No | Chain target (`mainnet`, `sepolia`, o vacio para slot) |
| `VITE_CONTROLLER_PRESET` | No | Preset del controller en Cartridge |
| `VITE_ENABLE_VRF` | No | `true` para incluir policy de VRF |
