# Dojo Starter React

Template para construir apps on-chain con **Dojo Engine** + **Starknet** + **React**.

## Que incluye

- Login con Cartridge Controller + modo invitado (burner accounts)
- Soporte para Slot deployments (Torii/GraphQL/RPC auto-resueltos)
- Transacciones write, view calls y queries GraphQL via Torii
- Chakra UI + React Router
- Hook generico para ejecutar transacciones (`useContractActions`)
- Pagina demo con ejemplos de cada patron

## Quick Start

```bash
cp .env_example .env
# Editar .env con tu Slot instance y namespace

npm install --legacy-peer-deps
npm run dev
```

## Documentacion

| Guia | Descripcion |
|------|-------------|
| [Arquitectura](docs/architecture.md) | Estructura del proyecto, providers, flujo de datos |
| [Setup](docs/setup.md) | Instalacion, configuracion de entorno, deployment |
| [Adaptar contratos](docs/adapting-contracts.md) | Como conectar tus propios contratos Cairo |
| [API Reference](docs/api-reference.md) | Hooks, contexts y utilidades disponibles |
| [Autenticacion](docs/authentication.md) | Controller, burner accounts, flujo de login |

## Estructura del proyecto

```
dojoConfig.ts              # Configuracion de Dojo
manifest_slot.json         # Manifest de contratos (reemplazar con el tuyo)
src/
  main.tsx                 # Bootstrap de la app
  App.tsx                  # Shell de la app
  AppRoutes.tsx            # Definicion de rutas
  graphQLClient.ts         # Cliente GraphQL para Torii
  config/
    cartridgeUrls.ts       # Resolucion de endpoints Slot
  dojo/
    setup.ts               # Init de Torii + DojoProvider + BurnerManager
    DojoContext.tsx         # Contexto React de Dojo + BurnerProvider
    WalletContext.tsx       # Estado de wallet (controller/burner)
    useDojo.tsx             # Hook principal
    accountStore.tsx        # Zustand store para cuenta activa
    controller/
      controller.ts        # Setup de ControllerConnector
      policies.ts          # Auto-generacion de policies desde manifest
      constants.ts          # Direccion VRF
    typescript/
      contracts.gen.ts     # Bindings generados (placeholder)
      defineContractComponents.ts
      models.gen.ts
  providers/
    StarknetProvider.tsx   # Config de chain Starknet
  pages/
    HomePage.tsx           # Pagina de login
    DemoPage.tsx           # Ejemplos de read/write/GraphQL
  hooks/
    useContractActions.ts  # Hook generico para transacciones
  theme/
    theme.ts               # Tema Chakra simplificado
```

## Scripts

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Levantar servidor de desarrollo |
| `npm run build` | Build de produccion |
| `npm run generate` | Generar bindings TypeScript desde manifest |
| `npm run test` | Correr tests con Vitest |

## Stack tecnologico

| Tecnologia | Uso |
|------------|-----|
| [Dojo Engine](https://www.dojoengine.org/) | Framework on-chain (ECS) |
| [Starknet](https://www.starknet.io/) | L2 blockchain |
| [Cartridge Controller](https://cartridge.gg/) | Wallet + session keys |
| [Torii](https://www.dojoengine.org/) | Indexer para leer estado on-chain |
| [React](https://react.dev/) | UI framework |
| [Chakra UI](https://chakra-ui.com/) | Component library |
| [Zustand](https://zustand-demo.pmnd.rs/) | State management |
| [graphql-request](https://github.com/jasonkuhrt/graphql-request) | Cliente GraphQL liviano |
