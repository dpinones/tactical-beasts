# Setup

## Prerequisitos

- Node.js >= 20
- Un proyecto Dojo con contratos Cairo compilados
- Uno de los siguientes backends:
  - **Local**: Katana + Torii corriendo localmente
  - **Slot**: Deployment en Cartridge Slot

## Instalacion

```bash
# Clonar/copiar el template
cd dojo-starter-react

# Instalar dependencias
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` es necesario por conflictos de versiones entre paquetes de Dojo.

## Configuracion del entorno

### 1. Crear archivo .env

```bash
cp .env_example .env
```

### 2. Configurar segun tu backend

#### Opcion A: Local (Katana + Torii)

Levantar Katana y Torii en tu proyecto de contratos:

```bash
# Terminal 1: Katana (devnet local)
katana --dev

# Terminal 2: Torii (indexer)
torii --world <WORLD_ADDRESS> --rpc http://localhost:5050
```

Configurar `.env`:
```env
# Dejar VITE_SLOT_INSTANCE vacio para usar localhost
VITE_SLOT_INSTANCE=
VITE_DOJO_NAMESPACE=tu_namespace
# Estas son las cuentas default de katana --dev
VITE_MASTER_ADDRESS=0x6162896d1d7ab204c7ccac6dd5f8e9e7c25ecd5ae4fcb4ad32e57786bb46e03
VITE_MASTER_PRIVATE_KEY=0x1800000000300000180000000000030000000000003006001800006600
VITE_ENV=local
```

Endpoints resultantes:
- RPC: `http://localhost:5050`
- Torii: `http://localhost:8080`
- GraphQL: `http://localhost:8080/graphql`

#### Opcion B: Cartridge Slot

Crear deployments en Slot:

```bash
slot deployments create my-app katana
slot deployments create my-app torii --world <WORLD_ADDRESS>
```

Configurar `.env`:
```env
VITE_SLOT_INSTANCE=my-app
VITE_DOJO_NAMESPACE=tu_namespace
VITE_MASTER_ADDRESS=0x...
VITE_MASTER_PRIVATE_KEY=0x...
VITE_ENV=slot
```

Endpoints resultantes:
- RPC: `https://api.cartridge.gg/x/my-app/katana`
- Torii: `https://api.cartridge.gg/x/my-app/torii`
- GraphQL: `https://api.cartridge.gg/x/my-app/torii/graphql`

### 3. Copiar el manifest

Copiar el manifest generado por Sozo a la raiz del proyecto:

```bash
cp ../tu-proyecto-cairo/manifest.json ./manifest_slot.json
```

> El archivo debe llamarse `manifest_slot.json` — el template lo importa con ese nombre.

## Levantar el servidor de desarrollo

```bash
npm run dev
```

La app estara disponible en `http://localhost:5173` (puerto default de Vite).

## Build de produccion

```bash
npm run build
```

Los archivos se generan en `dist/`. Pueden servirse con cualquier servidor estatico.

```bash
# Preview del build
npm run preview
```

## Configuracion para mainnet/sepolia

Para deployments en mainnet o sepolia:

```env
VITE_SLOT_INSTANCE=
VITE_CHAIN=mainnet          # o "sepolia"
VITE_CONTROLLER_PRESET=mi-preset
```

> En mainnet/sepolia el modo Guest se deshabilita automaticamente.

## Troubleshooting

### "Failed to connect"

La app muestra este error cuando no puede conectarse a Dojo. Verificar:

1. Katana/Torii estan corriendo (si es local)
2. `VITE_SLOT_INSTANCE` esta correctamente escrito (si es Slot)
3. El `manifest_slot.json` tiene la `world.address` correcta

### "Error initializing burnerManager"

La cuenta master no tiene fondos o la direccion/clave son incorrectas. Si usas Katana en modo dev, usa las cuentas prefundeadas que imprime al iniciar.

### Dependencias no instalan

Siempre usar `--legacy-peer-deps`:
```bash
npm install --legacy-peer-deps
```
