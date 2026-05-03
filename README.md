# ÁureaCert

Aplicación de escritorio para gestorías y asesorías españolas. Gestiona certificados digitales, trámites AEAT/TGSS, clientes y calendario fiscal desde un entorno local y seguro.

Construida con **Electron 29 · React 18 · TypeScript · SQLite**.

---

## Requisitos previos

| Herramienta | Versión recomendada | Notas |
|---|---|---|
| Node.js | **20 LTS** o **22 LTS** | No usar Node 25+: `better-sqlite3` no tiene binarios para esa versión |
| npm | 10+ | Incluido con Node |
| Git | cualquiera | |
| Xcode Command Line Tools *(macOS)* | — | `xcode-select --install` |
| Build Tools *(Windows)* | — | `npm install -g windows-build-tools` en PowerShell como Admin |

---

## Clonar e instalar

```bash
# 1. Clonar el repositorio
git clone https://github.com/josemagarciaruiz-cmd/aureacertificados.git
cd aureacertificados

# 2. Instalar dependencias SIN ejecutar scripts de compilación
#    (evita que better-sqlite3 y keytar intenten compilarse contra el Node del sistema)
npm install --ignore-scripts

# 3. Compilar los módulos nativos contra el Node integrado en Electron
npx @electron/rebuild

# 4. Si Electron no se descargó (puede ocurrir con --ignore-scripts):
node node_modules/electron/install.js
```

> **¿Por qué `--ignore-scripts`?**
> `better-sqlite3` y `keytar` son módulos nativos (C++) que deben compilarse contra
> el runtime de Electron, no contra el Node.js del sistema. Si se compilan mal la app
> arranca con pantalla negra o se cierra al instante.

---

## Desarrollo

```bash
npm run dev
```

Esto lanza simultáneamente:
- El servidor de Vite para el renderer en `http://localhost:5173`
- El proceso principal de Electron

La ventana se abre con DevTools ya visibles en modo dev.

---

## Estructura del proyecto

```
aureacertificados/
├── electron/
│   ├── main.ts              # Proceso principal de Electron
│   ├── preload.ts           # Bridge contextIsolation → renderer
│   ├── handlers/            # IPC handlers (certificados, clientes, BBDD…)
│   └── services/            # Lógica de negocio del proceso principal
├── src/
│   ├── index.html
│   ├── main.tsx             # Entrada React
│   ├── App.tsx
│   ├── components/          # Componentes reutilizables
│   ├── pages/               # Vistas: Dashboard, Clientes, Certificados…
│   ├── store/               # Estado global
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilidades
│   ├── styles/              # CSS global y variables de diseño
│   └── types/               # Tipos TypeScript compartidos
├── resources/               # Iconos de la app
├── electron.vite.config.ts  # Configuración de electron-vite
├── tailwind.config.js
└── package.json
```

---

## Build para distribución

```bash
# Todas las plataformas (según el SO donde ejecutes)
npm run package

# Solo Windows
npm run package:win

# Solo macOS
npm run package:mac

# Solo Linux
npm run package:linux
```

El instalador resultante se genera en la carpeta `release/`.

---

## Solución de problemas frecuentes

### Pantalla negra al arrancar
Los módulos nativos no están compilados para Electron. Ejecuta:
```bash
npx @electron/rebuild
```

### "No electron app entry file found"
El campo `main` en `package.json` debe apuntar a `out/main/index.js`. Verifica que no haya sido modificado.

### Error de compilación de `better-sqlite3` con Node 25
Cambia a Node 20 LTS o 22 LTS. Usa [nvm](https://github.com/nvm-sh/nvm) para gestionar versiones:
```bash
nvm install 22
nvm use 22
```

### Electron no arranca después de `--ignore-scripts`
```bash
node node_modules/electron/install.js
```

---

## Licencia

Uso interno. Todos los derechos reservados.
