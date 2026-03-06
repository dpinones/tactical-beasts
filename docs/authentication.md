# Autenticacion

El template soporta dos metodos de autenticacion: **Cartridge Controller** (wallet real) y **Guest** (burner accounts).

## Cartridge Controller

### Que es

Cartridge Controller es un wallet de Starknet con soporte de session keys. Permite a los usuarios aprobar un conjunto de operaciones (policies) y luego ejecutar transacciones sin popups de confirmacion.

### Flujo

1. Usuario hace click en "Login" en `HomePage`
2. Se llama `switchToController()` que invoca `connect({ connector: connectors[0] })`
3. Se abre un popup de Cartridge Controller
4. El usuario se autentica (Google, Discord, WebAuthn, password)
5. Se aprueban las policies (definidas en `policies.ts`)
6. El controller retorna la cuenta conectada
7. `WalletContext` detecta la conexion y setea `accountType: "controller"`
8. `DojoContext` actualiza la cuenta activa via `useAccountStore`
9. Se redirige a `/demo`

### Policies

Las policies se auto-generan desde el manifest en `src/dojo/controller/policies.ts`. Para cada sistema del contrato, se crean policies para todos los metodos que no sean getters ni builders.

Ejemplo de policy generada:
```json
{
  "contracts": {
    "0x1234...": {
      "methods": [
        { "name": "Increment", "entrypoint": "increment" },
        { "name": "Spawn", "entrypoint": "spawn" }
      ]
    }
  }
}
```

### VRF Policy

Si `VITE_ENABLE_VRF=true`, se agrega una policy adicional para el proveedor de VRF (Verifiable Random Function) de Cartridge:

```json
{
  "0x051f...": {
    "methods": [
      { "name": "Request Random", "entrypoint": "request_random" }
    ]
  }
}
```

### Controller Preset

Si tienes un preset configurado en Cartridge, setearlo en `.env`:
```env
VITE_CONTROLLER_PRESET=mi-preset
```

---

## Guest (Burner Accounts)

### Que es

Las burner accounts son cuentas temporales pre-fondeadas desde la cuenta master. No requieren interaccion del usuario para autenticarse. Son utiles para testing y para dar acceso rapido sin wallet.

### Flujo

1. Usuario hace click en "Guest" en `HomePage`
2. Se llama `connectAsGuest()`
3. Se genera un username temporal (`guest_XXXXX`)
4. Se setea `connectionStatus: "connecting_burner"`
5. `WalletContext` detecta el cambio y usa la burner account del `BurnerManager`
6. Se setea `accountType: "burner"` y se persiste en `localStorage`
7. Se redirige a `/demo`

### Limitaciones

- Solo disponible cuando `VITE_CHAIN` **no** es `mainnet` ni `sepolia`
- Las burner accounts necesitan fondos de la cuenta master
- En Katana devnet, la cuenta master pre-fondeada funciona automaticamente
- En Slot, la cuenta master necesita tener fondos suficientes

### BurnerManager

El `BurnerManager` (de `@dojoengine/create-burner`) se inicializa en `setup.ts`:

```ts
const burnerManager = new BurnerManager({
  masterAccount: new Account({...}),
  accountClassHash: config.accountClassHash,
  rpcProvider: dojoProvider.provider,
  feeTokenAddress: config.feeTokenAddress,
});

await burnerManager.init();
if (burnerManager.list().length === 0) {
  await burnerManager.create();  // crea primera burner
}
```

---

## Persistencia de sesion

El tipo de cuenta se persiste en `localStorage` con la key `ACCOUNT_TYPE`:

| Valor | Significado |
|-------|-------------|
| `"controller"` | El usuario se conecto con Controller |
| `"burner"` | El usuario entro como Guest |
| `null` / ausente | No hay sesion activa |

Al recargar la pagina:
- Si `ACCOUNT_TYPE === "controller"`: se intenta reconectar automaticamente con el Controller (usando `autoConnect` de starknet-react)
- Si `ACCOUNT_TYPE === "burner"`: se usa la burner account existente del `BurnerManager`
- Si no hay valor: se muestra `HomePage` para elegir metodo

### Logout

`logout()` limpia todo el estado:
```ts
const logout = () => {
  disconnect();                              // desconecta starknet-react
  setAccountType(null);                      // limpia tipo
  setFinalAccount(null);                     // limpia cuenta
  localStorage.removeItem("ACCOUNT_TYPE");   // limpia persistencia
  setConnectionStatus("selecting");          // vuelve a seleccion
};
```

---

## Cambiar de Guest a Controller

Es posible hacer "upgrade" de Guest a Controller sin perder la sesion:

```tsx
const { switchToController } = useDojo();

switchToController((payload) => {
  console.log("Conectado como:", payload.username);
  console.log("Account:", payload.account.address);
});
```

Esto abre el popup de Controller. Si el usuario se conecta exitosamente, el `accountType` cambia de `"burner"` a `"controller"` y el callback de exito se ejecuta con el username y la nueva cuenta.

---

## Diagrama de estados

```
          ┌──────────────────┐
          │    selecting     │  <── estado inicial / post-logout
          └──────┬───────────┘
                 │
        ┌────────┴────────┐
        │                 │
   click Login      click Guest
        │                 │
        v                 v
┌───────────────┐ ┌──────────────────┐
│  connecting_  │ │   connecting_    │
│  controller   │ │   burner         │
└───────┬───────┘ └──────┬───────────┘
        │                │
   Controller ok    Burner ready
        │                │
        v                v
┌───────────────┐ ┌──────────────────┐
│  accountType:  │ │  accountType:    │
│  "controller"  │ │  "burner"        │
│  finalAccount  │ │  finalAccount    │
│  = controller  │ │  = burner        │
└───────────────┘ └──────────────────┘
        │                │
        └────────┬───────┘
                 │
            click Logout
                 │
                 v
          ┌──────────────┐
          │  selecting   │
          └──────────────┘
```
