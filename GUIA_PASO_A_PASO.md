# 🍳 Recetario: API de usuarios con Express, Supabase, Prisma 8 y búsqueda con IA

> **Para quién es esta guía:** para personas que están empezando a programar.
> No hace falta saber nada de backend. Vamos a explicar **qué** se hizo en este proyecto, **por qué**, **cómo replicarlo**, **cómo probar cada paso** y **qué pasa si cambias algo**.
>
> Lo vamos a contar como si fuera **una receta de cocina**: primero los ingredientes, después preparar la cocina y luego, paso a paso, el plato.

---

## 📑 Índice

0. [La idea del plato (qué vamos a construir)](#0-la-idea-del-plato)
1. [El restaurante: cómo entender la arquitectura](#1-el-restaurante-cómo-entender-la-arquitectura)
2. [Ingredientes y utensilios (qué instalar)](#2-ingredientes-y-utensilios-qué-instalar)
3. [Paso 1 – Preparar la cocina: crear el proyecto Node](#paso-1--preparar-la-cocina-crear-el-proyecto-node)
4. [Paso 2 – Encender los fogones: el servidor Express](#paso-2--encender-los-fogones-el-servidor-express)
5. [Paso 3 – La despensa: base de datos en Supabase y el archivo .env](#paso-3--la-despensa-base-de-datos-en-supabase-y-el-archivo-env)
6. [Paso 4 – El inventario de la despensa: Prisma 8](#paso-4--el-inventario-de-la-despensa-prisma-8)
7. [Paso 5 – Primer plato: registrar usuarios (con bcrypt)](#paso-5--primer-plato-registrar-usuarios-con-bcrypt)
8. [Paso 6 – Segundo plato: login y token JWT](#paso-6--segundo-plato-login-y-token-jwt)
9. [Paso 7 – El portero: middlewares y ruta protegida](#paso-7--el-portero-middlewares-y-ruta-protegida)
10. [Paso 8 – Ingrediente secreto: vectores (pgvector) y embeddings con Gemini](#paso-8--ingrediente-secreto-vectores-pgvector-y-embeddings-con-gemini)
11. [Paso 9 – El postre: búsqueda semántica + reranker de Jina](#paso-9--el-postre-búsqueda-semántica--reranker-de-jina)
12. [El viaje de un dato: de Postman a la base de datos y vuelta](#12-el-viaje-de-un-dato)
13. [¿Qué pasa si…? (experimentos para romper cosas a propósito)](#13-qué-pasa-si)
14. [Fallos que tiene la receta y cómo mejorarla (deberes)](#14-fallos-que-tiene-la-receta-y-cómo-mejorarla-deberes)
15. [Chuleta final: comandos y documentación](#15-chuleta-final)

---

## 0. La idea del plato

Vamos a construir una **API** (un programa que no tiene pantalla: recibe peticiones por internet y responde con datos). Nuestra API sabe hacer 4 cosas:

| Ruta | Qué hace |
|---|---|
| `POST /api/user/register` | Registra un usuario (guarda su contraseña cifrada y un "vector" generado con IA) |
| `POST /api/user/login` | Comprueba email y contraseña, y si son correctos devuelve un **token** (una "pulsera VIP") |
| `POST /api/user/getallusers` | Devuelve todos los usuarios, **solo** si traes token válido y eres admin |
| `POST /api/user/getuser` | Le escribes una frase en lenguaje natural ("alguien que viva cerca de Sol") y busca el usuario cuya dirección se parece más, usando IA |

**Tecnologías (los "ingredientes principales"):**

- **Node.js** → el "fuego": permite ejecutar JavaScript fuera del navegador.
- **Express** → la "cocina montada": facilita crear un servidor web.
- **Supabase** → nos da una base de datos **PostgreSQL** en la nube, gratis.
- **Prisma 8** → un **ORM**: un traductor entre JavaScript y la base de datos, para no escribir SQL a mano.
- **pgvector** → extensión de PostgreSQL para guardar y comparar **vectores** (listas de números que representan significado).
- **bcrypt** → para cifrar contraseñas.
- **jsonwebtoken (JWT)** → para crear y validar tokens de sesión.
- **Google Gemini (`@google/genai`)** → convierte texto en vectores (embeddings).
- **Jina Reranker** → reordena resultados por relevancia.

---

## 1. El restaurante: cómo entender la arquitectura

Antes de cocinar, entendamos **cómo está organizado el restaurante**. Cada carpeta de `src/` es un puesto de trabajo con una única responsabilidad:

```
Cliente (Postman / navegador / app)
   │  "Quiero registrarme" (petición HTTP)
   ▼
index.js ............... 🚪 La PUERTA del restaurante (arranca el servidor)
   ▼
routers/ ............... 🧑‍💼 El MAÎTRE: mira qué pides y te manda a la mesa correcta
   ▼
middleware/ ............ 🛡️ El PORTERO: "¿Tienes entrada? ¿Eres VIP?" (opcional)
   ▼
controllers/ ........... 🧾 El CAMARERO: toma la comanda y luego te trae el plato
   ▼
services/ .............. 👨‍🍳 El CHEF: aquí está la lógica (cifrar, comparar, llamar a la IA…)
   ▼
models/ ................ 📦 El DESPENSERO: el único que entra a la despensa
   ▼
prisma/db.ts ........... 🔑 La LLAVE de la despensa (conexión a la base de datos)
   ▼
Supabase (PostgreSQL) .. 🏪 La DESPENSA (donde se guardan los datos)
```

**¿Por qué separarlo así y no meter todo en un archivo?**

- Si mañana cambias de base de datos, solo tocas `models/`.
- Si cambias cómo se cifran contraseñas, solo tocas `services/`.
- Cada archivo es pequeño y fácil de leer. Esto se llama **separación de responsabilidades** y es la base de patrones como MVC.
- En un restaurante real, el camarero no cocina y el chef no atiende mesas. Si uno falla, sabes a quién preguntar.

**Estructura final del proyecto:**

```
repaso_supabase/
├── index.js                     ← puerta de entrada
├── package.json                 ← lista de ingredientes y scripts
├── prisma.config.ts             ← configuración de la CLI de Prisma
├── tsconfig.json                ← configuración de TypeScript (para los .ts de Prisma)
├── .env                         ← SECRETOS (no se sube a git)
├── .env.example                 ← plantilla de secretos (sí se sube)
├── .gitignore                   ← lo que git debe ignorar
├── migrations/                  ← historial de cambios en la base de datos
└── src/
    ├── controllers/user.controller.js
    ├── middleware/token.middleware.js
    ├── middleware/user.middleware.js
    ├── models/user.model.js
    ├── prisma/
    │   ├── contract.prisma      ← TÚ lo escribes: forma de las tablas
    │   ├── contract.json        ← GENERADO
    │   ├── contract.d.ts        ← GENERADO
    │   └── db.ts                ← conexión a la base de datos
    ├── routers/user.route.js
    └── services/
        ├── user.service.js
        ├── token.service.js
        └── embedding.service.js
```

---

## 2. Ingredientes y utensilios (qué instalar)

### Utensilios (programas en tu ordenador)

| Herramienta | Para qué | Dónde se consigue | Cómo comprobar que está |
|---|---|---|---|
| **Node.js** (v22.6 o superior; el proyecto usa v24) | Ejecutar JavaScript | https://nodejs.org (descarga la versión LTS) | `node -v` |
| **npm** (viene con Node) | Instalar librerías | Viene con Node | `npm -v` |
| **Git** | Guardar versiones del código | https://git-scm.com | `git --version` |
| **VS Code** | Editor de código | https://code.visualstudio.com | — |
| **Postman** o la extensión **Thunder Client** de VS Code | Enviar peticiones a la API para probarla | https://www.postman.com / Marketplace de VS Code | — |

> ⚠️ **¿Por qué Node 22.6 o superior?** En este proyecto, un archivo `.js` importa un archivo `.ts` (`import { db } from "../prisma/db.ts"`). Las versiones modernas de Node son capaces de ejecutar TypeScript sencillo "quitando los tipos" automáticamente. Con un Node antiguo, ese import falla.

### Cuentas (gratuitas) que necesitas

| Servicio | Para qué | Dónde |
|---|---|---|
| **Supabase** | Base de datos PostgreSQL | https://supabase.com → *New project* |
| **Google AI Studio** | API key de Gemini (embeddings) | https://aistudio.google.com → *Get API key* |
| **Jina AI** | API key del reranker | https://jina.ai → *API* |

### Ingredientes (librerías de npm)

| Paquete | Tipo | Para qué |
|---|---|---|
| `express` | dependencia | Servidor web |
| `dotenv` | dependencia | Leer el archivo `.env` |
| `bcrypt` | dependencia | Cifrar contraseñas |
| `jsonwebtoken` | dependencia | Crear/validar tokens |
| `@prisma/orm-postgres` | dependencia | Cliente de Prisma 8 para PostgreSQL |
| `@prisma/orm-extension-pgvector` | dependencia | Soporte de vectores en Prisma |
| `@google/genai` | dependencia | SDK de Gemini |
| `prisma` | **dev** | La CLI (comandos `npx prisma ...`) |
| `@prisma/cli-engine` | **dev** | Necesario para `prisma.config.ts` |
| `@types/node` | **dev** | Tipos de Node para TypeScript |
| `nodemon` | **dev** | Reinicia el servidor solo cuando guardas cambios |

> **¿Qué es "dev" (devDependencies)?** Son herramientas que solo usas mientras **cocinas** (desarrollas), no cuando el restaurante está abierto al público (producción). Como el cuchillo del chef: el cliente no se lo lleva en el plato.

---

## Paso 1 – Preparar la cocina: crear el proyecto Node

### 🥄 Qué hacemos

```bash
mkdir repaso_supabase
cd repaso_supabase
git init
npm init -y
```

- `npm init -y` crea el archivo **`package.json`**, que es la **lista de la compra y el libro de instrucciones** del proyecto: nombre, librerías, y comandos (scripts).

### Activar los módulos modernos (`"type": "module"`)

Abre `package.json` y añade:

```json
"type": "module",
```

**¿Por qué?** Hay dos formas de importar código en Node:

| Estilo antiguo (CommonJS) | Estilo moderno (ES Modules) |
|---|---|
| `const express = require('express')` | `import express from 'express'` |
| `module.exports = algo` | `export default algo` / `export function ...` |

Este proyecto usa **siempre `import`/`export`**. Sin `"type": "module"` Node daría el error *"Cannot use import statement outside a module"*.

> 🔎 **Detalle importante de ES Modules:** al importar archivos tuyos **hay que poner la extensión**: `'./src/routers/user.route.js'`. Si pones `'./src/routers/user.route'` sin `.js`, falla.

### Scripts

En `package.json`, dentro de `"scripts"`:

```json
"scripts": {
  "start": "node index.js",
  "dev": "nodemon index.js",
  "contract:emit": "prisma contract emit"
}
```

- `npm run dev` → arranca el servidor con **nodemon** (se reinicia solo al guardar). Úsalo mientras programas.
- `npm start` → arranca con `node` normal (como se haría en producción).
- `npm run contract:emit` → atajo para regenerar los archivos de Prisma (lo veremos en el Paso 4).

### Instalar los primeros ingredientes

```bash
npm install express dotenv
npm install -D nodemon
```

Se crea la carpeta `node_modules/` (las librerías descargadas) y `package-lock.json` (las versiones **exactas** instaladas, para que todo el equipo tenga lo mismo).

### `.gitignore`

Crea `.gitignore` con:

```
node_modules/
dist/
.env
```

**¿Por qué?**
- `node_modules/` pesa muchísimo y se regenera con `npm install`. No se sube.
- `.env` contiene **contraseñas y claves**. **Jamás** se sube a GitHub. Si lo subes, cualquiera puede usar tu base de datos o gastarse tu saldo de la API de IA.

### ✅ Cómo probar

```bash
npm -v
cat package.json   # debe tener "type": "module"
```

### 💥 Qué pasa si…
- **…quitas `"type": "module"`** → Error: *Cannot use import statement outside a module*.
- **…no pones `node_modules` en `.gitignore`** → subirás miles de archivos a GitHub.

📚 **Documentación:** https://docs.npmjs.com/cli/commands/npm-init · https://nodejs.org/api/esm.html

---

## Paso 2 – Encender los fogones: el servidor Express

### 🥄 Código: [index.js](index.js)

```js
import express from 'express'
import 'dotenv/config'
import userRouter from './src/routers/user.route.js'

const port = process.env.port || 3000

const app = express();
app.use(express.json())

app.get("/", (req, res) => {
    res.send(req.body)
})

app.use('/api/user', userRouter)

app.listen(port, () => {
    console.log("http://localhost:" + port)
})
```

### 🔍 Línea a línea

| Línea | Qué hace | De dónde viene | Por qué |
|---|---|---|---|
| `import express from 'express'` | Trae la librería Express | `node_modules/express` | Es la herramienta que crea el servidor |
| `import 'dotenv/config'` | Lee el archivo `.env` y mete sus valores en `process.env` | librería `dotenv` | Para no escribir secretos en el código |
| `import userRouter from ...` | Trae el "maître" de usuarios | `src/routers/user.route.js` (lo exporta con `export default router`) | Para delegarle todas las rutas `/api/user/...` |
| `const port = process.env.port \|\| 3000` | Usa el puerto del `.env`; si no existe, el 3000 | `process.env` (objeto global de Node) | Así puedes cambiar el puerto sin tocar código. El `\|\|` significa "si lo de la izquierda está vacío, usa lo de la derecha" |
| `const app = express()` | Crea la aplicación (el restaurante) | Express | Todo se cuelga de `app` |
| `app.use(express.json())` | Middleware que **traduce** el cuerpo JSON de las peticiones a un objeto JS en `req.body` | Express | ⚠️ Sin esto, `req.body` es `undefined` y nada funciona |
| `app.get("/", ...)` | Ruta de prueba en `/` | — | Para comprobar que el servidor responde |
| `app.use('/api/user', userRouter)` | Todo lo que empiece por `/api/user` lo gestiona `userRouter` | — | Agrupa rutas por tema |
| `app.listen(port, ...)` | Abre el restaurante en ese puerto | Express | Sin esto el programa termina y no escucha nada |

> 🧠 **`req` y `res`**: toda ruta de Express recibe estos dos objetos.
> - `req` (*request*, petición) = **la comanda del cliente**: trae `req.body` (datos enviados), `req.headers` (cabeceras, como el token), `req.params`, `req.query`…
> - `res` (*response*, respuesta) = **la bandeja para devolver el plato**: `res.status(200)`, `res.send(...)`, `res.json(...)`.

> 📝 **Nota sobre `process.env.port`**: en este proyecto la variable se llama `port` en minúsculas. Por convención se suele usar `PORT` en mayúsculas (muchos servicios de hosting la inyectan así). Las variables de entorno **distinguen mayúsculas/minúsculas**: `port` ≠ `PORT`.

### ✅ Cómo probar

(De momento, comenta la línea del `userRouter` y la de `app.use('/api/user'...)` si todavía no has creado ese archivo.)

```bash
npm run dev
```

Debe aparecer `http://localhost:3000`. Ábrelo en el navegador: verás una página vacía (no hay body en un GET del navegador), pero **sin error**. ¡Fogones encendidos! 🔥

### 💥 Qué pasa si…
- **…quitas `app.use(express.json())`** → en todas las rutas `req.body` será `undefined` y `const { email } = req.body` lanzará *Cannot destructure property 'email' of 'req.body' as it is undefined*.
- **…el puerto 3000 ya está ocupado** → error `EADDRINUSE`. Cambia `port` en `.env` o cierra el otro programa.
- **…quitas `app.listen`** → el programa arranca y termina al instante.

📚 **Documentación:** https://expressjs.com/ (mira "Getting started" y "Routing") · https://github.com/motdotla/dotenv

---

## Paso 3 – La despensa: base de datos en Supabase y el archivo `.env`

### 🥄 Qué hacemos

1. Entra en https://supabase.com y crea un **New project**. Apunta la **contraseña de la base de datos** (la necesitarás).
2. En el proyecto, pulsa el botón **Connect** (arriba). Copia la **connection string** de tipo URI. Tiene esta forma:
   ```
   postgresql://postgres.xxxxx:[TU-PASSWORD]@aws-0-eu-xxx.pooler.supabase.com:5432/postgres
   ```
   > 💡 Si tu red no tiene IPv6, usa la opción **Session pooler** que ofrece Supabase en esa misma ventana. Si la contraseña tiene caracteres raros (`@`, `#`, `/`), hay que codificarlos o, más fácil, usar una contraseña sin ellos.
3. Crea en la raíz del proyecto el archivo **`.env`**:

```env
DATABASE_URL="postgresql://...tu cadena de Supabase..."

port=3000

tokenKey=una_frase_larga_y_secreta_que_solo_tu_sepas

googleApiKey=tu_api_key_de_google_ai_studio

jinaApiKey=tu_api_key_de_jina
```

4. Y un **`.env.example`** (este SÍ se sube a git) con los **nombres** pero sin los valores reales, para que tus compañeros sepan qué variables necesitan.

### 🔍 ¿Qué es cada variable y quién la usa?

| Variable | Quién la lee | Para qué |
|---|---|---|
| `DATABASE_URL` | `prisma.config.ts` y `src/prisma/db.ts` | Dirección + usuario + contraseña de la base de datos |
| `port` | `index.js` | Puerto del servidor |
| `tokenKey` | `src/services/token.service.js` | "Sello" secreto con el que se firman los tokens JWT |
| `googleApiKey` | `src/services/embedding.service.js` | Llamar a Gemini |
| `jinaApiKey` | `src/services/embedding.service.js` | Llamar al reranker de Jina |

**¿Por qué un `.env` y no escribirlo en el código?** Porque el código se comparte (GitHub) y los secretos no. Además, en tu ordenador y en el servidor de producción las claves serán distintas: solo cambias el `.env`, no el código.

### ✅ Cómo probar
En Supabase → **SQL Editor**, ejecuta:
```sql
SELECT version();
```
Debe salir PostgreSQL 15 o superior (Prisma 8 lo exige).

### 💥 Qué pasa si…
- **…la contraseña de `DATABASE_URL` es incorrecta** → Prisma dará error de autenticación al conectar.
- **…subes el `.env` a GitHub** → GitHub y Google pueden detectar la clave filtrada; tendrás que **regenerar todas las claves**. Borrar el archivo después no basta: queda en el historial de git.

📚 **Documentación:** https://supabase.com/docs/guides/database/connecting-to-postgres

---

## Paso 4 – El inventario de la despensa: Prisma 8

### 🧠 Primero, ¿qué es un ORM y por qué usarlo?

Una base de datos PostgreSQL se habla en **SQL**:
```sql
INSERT INTO "User" (email, password) VALUES ('ana@mail.com', '...');
```
Un **ORM** (Object-Relational Mapper) te deja hacer lo mismo con JavaScript:
```js
await db.orm.public.User.create({ email: 'ana@mail.com', password: '...' })
```
**Ventajas:** autocompletado en el editor, menos errores de escritura, protección contra *inyección SQL*, y un **historial de cambios** de las tablas (migraciones).

> ⚠️ **Prisma 8 es muy nuevo** (en este proyecto se usa una versión *release candidate*, `8.0.0-rc`). Es bastante distinto de Prisma 5/6, que es lo que vas a encontrar en la mayoría de tutoriales de internet (allí verás `schema.prisma`, `prisma generate`, `prisma.user.create`…). **En este proyecto los nombres son otros**: `contract.prisma`, `prisma contract emit`, `db.orm.public.User.create`. Si buscas ayuda, asegúrate de que es para Prisma 8.

### 🥄 4.1 Inicializar Prisma

```bash
npx prisma orm init
```

Esto genera (lo puedes ver en el primer commit del proyecto):
- `prisma.config.ts` — configuración de la CLI.
- `src/prisma/contract.prisma` — el **contrato** (forma de tus tablas).
- `src/prisma/db.ts` — el cliente que usa tu app.
- `tsconfig.json`, `.env.example` y `prisma-8.md` (un README de Prisma, léelo).

Si te faltan paquetes, instálalos:
```bash
npm install @prisma/orm-postgres @prisma/orm-extension-pgvector
npm install -D prisma @prisma/cli-engine @types/node
```

### 🥄 4.2 `prisma.config.ts` — "¿dónde está el inventario y dónde está la despensa?"

[prisma.config.ts](prisma.config.ts)

```ts
import 'dotenv/config';
import { definePrismaConfig } from '@prisma/cli-engine';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';
import pgvector from '@prisma/orm-extension-pgvector/control';

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./src/prisma/contract.prisma",   // dónde está el contrato
    extensions: [pgvector],                       // extensión de vectores (Paso 8)
    db: {
      connection: process.env['DATABASE_URL']!,   // a qué base de datos conectar
    },
  }),
});
```

- Lo usa **la CLI** (`npx prisma ...`), **no tu servidor**.
- `import 'dotenv/config'` → para poder leer `DATABASE_URL`.
- El `!` del final es TypeScript: "confía en mí, esto no es `undefined`".
- `pgvector/control` → la parte de la extensión que sabe **crear** cosas en la base de datos (instalar la extensión `vector`).

### 🥄 4.3 `contract.prisma` — la receta de las tablas

[src/prisma/contract.prisma](src/prisma/contract.prisma)

```prisma
// use prisma-8

types {
  Embedding768 = pgvector.Vector(768)
}

model User {
  id        Int                @id @default(autoincrement())
  email     String             @unique
  username  String?
  name      String?
  password  String?
  address   String?
  posts     Post[]
  embedding Embedding768?
  createdAt DateTime           @default(now()) @onCreate(now())
  updatedAt temporal.UpdatedAt
}

model Post {
  id        Int                @id @default(autoincrement())
  title     String
  content   String?
  author    User               @relation(fields: [authorId], references: [id])
  authorId  Int
  createdAt DateTime           @default(now()) @onCreate(now())
  updatedAt temporal.UpdatedAt
}
```

Cada `model` se convierte en una **tabla**; cada línea, en una **columna**.

| Fragmento | Significado | ¿Por qué? |
|---|---|---|
| `id Int @id @default(autoincrement())` | Número entero, clave primaria, se incrementa solo (1, 2, 3…) | Cada fila necesita un identificador único |
| `email String @unique` | Texto obligatorio que **no puede repetirse** | No puede haber dos cuentas con el mismo correo. Si lo intentas, PostgreSQL da error con código `23505` (lo usamos en el Paso 5) |
| `String?` | El `?` significa **opcional** (puede ser `NULL`) | `name`, `username`… no son obligatorios |
| `posts Post[]` | Un usuario tiene **muchos** posts | Relación 1 a N. No crea columna; es "virtual" |
| `author User @relation(fields: [authorId], references: [id])` | Cada post pertenece a un usuario, unido por `authorId` → `User.id` | Crea una **clave foránea** (foreign key) |
| `createdAt DateTime @default(now())` | Fecha de creación automática | Auditoría |
| `updatedAt temporal.UpdatedAt` | Se actualiza sola al modificar la fila | Auditoría |
| `types { Embedding768 = pgvector.Vector(768) }` | Creamos un **tipo propio**: un vector de 768 números | Lo explicamos en el Paso 8 |

### 🥄 4.4 Emitir el contrato

Cada vez que cambies `contract.prisma`:

```bash
npx prisma contract emit
# o el atajo:
npm run contract:emit
```

Esto genera dos archivos (¡no los edites a mano!):
- `contract.json` → la versión "compilada" que lee tu app en tiempo de ejecución.
- `contract.d.ts` → los **tipos** que dan autocompletado en VS Code.

> Analogía: `contract.prisma` es la receta escrita a mano; `contract.json` es la receta pasada a limpio e impresa para la cocina.

### 🥄 4.5 Crear las tablas en la base de datos (migraciones)

Una **migración** es un archivo que describe **un cambio** en la base de datos ("crear tabla User", "cambiar la columna embedding"…). Es como el **historial de reformas de la cocina**: cualquiera puede reproducirlas en orden y tener la misma cocina.

```bash
npx prisma migration plan     # compara el contrato con la última migración y escribe una nueva en migrations/
npx prisma db migrate         # aplica en la base de datos las migraciones pendientes
npx prisma migration status   # ¿qué migraciones faltan por aplicar?
```

> Para prototipos rápidos existen también `npx prisma db init` (crea las tablas directamente desde el contrato) y `npx prisma db update`. Si tienes dudas sobre las opciones de cada comando, añade `--help`: `npx prisma migration plan --help`.

En este proyecto hay dos migraciones propias en `migrations/app/`:
- **`20261113T1021_baseline`** → crea las tablas `User` y `Post`, el `@unique` del email y la foreign key.
- **`20261113T1030_vector_fix`** → cambia la columna `embedding` de `vector(1536)` a `vector(768)` (explicado en el Paso 8).

Y en `migrations/pgvector/` están las migraciones que trae la extensión, que ejecutan `CREATE EXTENSION IF NOT EXISTS vector`.

`migrations/snapshots/` guarda "fotos" del contrato en cada momento, y `migrations/app/refs/db.json` apunta a la foto en la que está ahora la base de datos.

**¿Por qué migraciones y no crear las tablas a mano en Supabase?** Porque así el cambio queda **en el código**, versionado en git, y tus compañeros (o el servidor de producción) pueden reproducirlo exactamente.

### 🥄 4.6 `db.ts` — la llave de la despensa

[src/prisma/db.ts](src/prisma/db.ts)

```ts
import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };
import pgvector from '@prisma/orm-extension-pgvector/runtime';

export const contract = contractFromJson<Contract>(contractJson);

export const db = postgres({
  contract,
  url: process.env['DATABASE_URL']!,
  extensions: [pgvector],
});
```

- Lee el contrato generado (`contract.json`) y crea **`db`**, el objeto con el que hablaremos con la base de datos.
- `pgvector/runtime` → la parte de la extensión que sabe **leer/escribir vectores y buscarlos** mientras la app está funcionando (a diferencia de `/control`, que se usa en la CLI).
- `export const db` → se exporta para que **solo** `models/` lo importe.

**¿Cómo se usa `db`?** Siempre con la forma `db.orm.<esquema>.<Modelo>.<acción>`:
```js
db.orm.public.User.create({...})               // INSERT
db.orm.public.User.where({ email }).first()    // SELECT ... LIMIT 1
db.orm.public.User.where({...}).all()          // SELECT ... (todas)
```
`public` es el **esquema** por defecto de PostgreSQL (como una "sección" de la despensa).

### ✅ Cómo probar el Paso 4
1. `npx prisma migration status` → no debe haber pendientes.
2. En Supabase → **Table Editor**: deben aparecer las tablas `User` y `Post`.

### 💥 Qué pasa si…
- **…cambias el contrato y no haces `contract emit`** → tu app sigue usando el `contract.json` viejo: los campos nuevos "no existen" para ella.
- **…haces `emit` pero no migras** → el código cree que hay una columna que en la base de datos no existe → error al consultar.
- **…quitas `@unique` del email** → podrás registrar dos usuarios con el mismo correo y el login se volverá ambiguo.
- **…borras la carpeta `migrations/`** → pierdes el historial; Prisma no sabrá qué se aplicó.

📚 **Documentación:** el archivo [prisma-8.md](prisma-8.md) del propio proyecto · https://www.prisma.io/docs · ayuda de la CLI con `npx prisma --help`

---

## Paso 5 – Primer plato: registrar usuarios (con bcrypt)

Ahora sí, cocinamos siguiendo **el recorrido del restaurante**: maître → camarero → chef → despensero.

```bash
npm install bcrypt
```

### 🥄 5.1 El maître: [src/routers/user.route.js](src/routers/user.route.js)

```js
import express from "express";
import { registerUserController /*, ...otros */ } from "../controllers/user.controller.js";

const router = express.Router();

router.post("/register", registerUserController);

export default router;
```

- `express.Router()` crea un "mini-app" solo para rutas de usuario.
- `router.post("/register", ...)` → cuando llegue un **POST** a `/register` llama al controlador.
- Como en `index.js` lo montamos en `/api/user`, la ruta completa es **`POST /api/user/register`**.
- `export default router` → es lo que `index.js` importa como `userRouter`.

> **¿Por qué POST y no GET?** GET es para **leer**; POST para **enviar datos** (crear). Además, los datos de un GET van en la URL (se ven, se guardan en el historial). Una contraseña **nunca** debe ir en la URL.

### 🥄 5.2 El camarero: [src/controllers/user.controller.js](src/controllers/user.controller.js)

```js
import * as userService from "../services/user.service.js";

export async function registerUserController(req, res) {
  const response = await userService.registerUserService(req)
  res.status(response.status).send(response.message);
}
```

- `import * as userService` → importa **todas** las funciones exportadas del servicio dentro de un objeto `userService`.
- El controlador **no piensa**: le pasa la petición al chef y devuelve lo que el chef diga.
- El servicio siempre devuelve un objeto `{ status, message }` → el controlador lo convierte en respuesta HTTP.

> **`async` / `await`**: hablar con la base de datos o con una IA **tarda**. `await` significa "espera aquí a que esto termine". Solo se puede usar `await` dentro de funciones marcadas con `async`. Si te lo olvidas, en vez del resultado tendrás una `Promise { <pending> }` (un "ticket de espera" en lugar del plato).

### 🥄 5.3 El chef: `registerUserService` en [src/services/user.service.js](src/services/user.service.js)

Versión original (primer commit, sin IA):

```js
import * as userModel from "../models/user.model.js";
import bcrypt from "bcrypt";

export async function registerUserService(req) {
  let { email, password, name, username, address } = req.body;
  try {
    const saltRounds = 10;
    password = await bcrypt.hash(password, saltRounds);

    await userModel.registerUserModel(email, password, name, username, address);
    return { status: 201, message: "usuario registrado" };
  } catch (e) {
    if (e.sqlState === "23505") {
      return { status: 409, message: "Correo duplicado" };
    }
    return { status: 400, message: "Error al crear usuario" };
  }
}
```

| Fragmento | Explicación |
|---|---|
| `let { email, password, ... } = req.body` | **Desestructuración**: saca esas propiedades del body en variables. Es `let` (no `const`) porque luego **reasignamos** `password` |
| `bcrypt.hash(password, 10)` | Convierte `"1234"` en algo como `"$2b$10$Xy..."`. Es un **hash**: va en una sola dirección, no se puede "descifrar" |
| `saltRounds = 10` | Cuántas vueltas de cifrado. Más vueltas = más seguro pero más lento. 10 es el estándar habitual |
| `try { ... } catch (e) { ... }` | "Intenta esto; si algo explota, en vez de tirar el servidor, haz esto otro" |
| `e.sqlState === "23505"` | `23505` es el código oficial de PostgreSQL para **"valor duplicado en campo único"** (el `@unique` del email) |
| `status: 201` | Código HTTP "Created" |
| `status: 409` | "Conflict": ya existe |
| `status: 400` | "Bad Request": algo vino mal |

**¿Por qué cifrar la contraseña?** Si alguien roba tu base de datos, no verá las contraseñas reales. Y como la gente reutiliza contraseñas, protegerlas es proteger también sus otras cuentas.

### 🥄 5.4 El despensero: `registerUserModel` en [src/models/user.model.js](src/models/user.model.js)

```js
import { db } from "../prisma/db.ts";

export async function registerUserModel(email, password, name, username, address, embedding) {
  const created = await db.orm.public.User.create({
    email, password, name, username, address, embedding
  });
  return created;
}
```

- `{ email, password }` es un atajo de JS: equivale a `{ email: email, password: password }`. Por eso **los nombres de las variables deben coincidir con los nombres de las columnas** del contrato.
- El modelo **no sabe nada de HTTP** (no ve `req` ni `res`). Solo recibe datos y los guarda.
- (El parámetro `embedding` se añadió en el Paso 8.)

### ✅ Cómo probar

Con el servidor arrancado (`npm run dev`), en Postman/Thunder Client:

- Método: **POST**
- URL: `http://localhost:3000/api/user/register`
- Body → **raw → JSON**:

```json
{
  "email": "ana@mail.com",
  "password": "1234",
  "name": "Ana",
  "username": "anita",
  "address": "Calle Mayor 1, Madrid"
}
```

Desde terminal (en PowerShell usa `curl.exe`, no `curl`):

```bash
curl.exe -X POST http://localhost:3000/api/user/register -H "Content-Type: application/json" -d "{\"email\":\"ana@mail.com\",\"password\":\"1234\",\"name\":\"Ana\",\"address\":\"Calle Mayor 1, Madrid\"}"
```

**Resultados esperados:**
1. Primera vez → `201 usuario registrado`.
2. Mismo email otra vez → `409 Correo duplicado`.
3. Mira en Supabase → Table Editor → `User`: la contraseña aparece como `$2b$10$...`. ✅

### 💥 Qué pasa si…
- **…no envías `password`** → `bcrypt.hash(undefined)` lanza error → cae en el `catch` → `400`.
- **…en Postman no eliges "JSON"** (envías texto) → `express.json()` no lo traduce → `req.body` vacío.
- **…cambias `saltRounds` a 15** → funciona, pero el registro tarda bastante más. Prueba y mide.
- **…guardas la contraseña sin `bcrypt`** → funciona… y es un agujero de seguridad grave.
- **…pones en el modelo `mail` en vez de `email`** → Prisma dirá que la columna `mail` no existe.

📚 **Documentación:** https://expressjs.com/en/guide/routing.html · https://www.npmjs.com/package/bcrypt · códigos HTTP: https://developer.mozilla.org/es/docs/Web/HTTP/Status

---

## Paso 6 – Segundo plato: login y token JWT

```bash
npm install jsonwebtoken
```

### 🧠 ¿Qué es un JWT?

HTTP **no tiene memoria**: cada petición es un cliente nuevo para el servidor. Para no pedir la contraseña en cada petición, cuando el login es correcto le damos al cliente una **pulsera VIP** (el token). En las siguientes peticiones la enseña y nosotros comprobamos que la pulsera es auténtica.

Un JWT tiene 3 partes separadas por puntos: `cabecera.datos.firma`. Los **datos se pueden leer** (pega uno en https://jwt.io), pero **no se pueden falsificar** sin la clave secreta (`tokenKey`) porque la firma dejaría de cuadrar.

> ⚠️ Por eso **nunca** metas la contraseña dentro del token.

### 🥄 6.1 El servicio de tokens: [src/services/token.service.js](src/services/token.service.js)

```js
import jwt from "jsonwebtoken";
import "dotenv/config";

const tokenKey = process.env.tokenKey;

export function createToken(userData) {
  return jwt.sign(userData, tokenKey);        // fabrica la pulsera
}

export function validateToken(token) {
  return jwt.verify(token, tokenKey);         // comprueba la pulsera (si es falsa, LANZA un error)
}
```

### 🥄 6.2 El modelo: buscar un usuario por email

```js
export async function getUserModel(email) {
  const result = db.orm.public.User.where({ email }).first();
  return result;
}
```
- `.where({ email })` → filtro `WHERE email = ...`.
- `.first()` → devuelve **un** usuario o `null` si no existe.

### 🥄 6.3 El chef: `loginUserService`

```js
export async function loginUserService(req) {
  const { email, password } = req.body;
  try {
    const userData = await userModel.getUserModel(email);
    if (userData) {
      const pass = await bcrypt.compare(password, userData.password);
      if (pass) {
        const tokenUserData = {
          name: userData.name,
          email: userData.email,
          username: userData.username,
          address: userData.address,
        };
        const token = createToken(tokenUserData);
        return { status: 200, message: token };
      } else {
        return { status: 401, message: "no autorizado" };
      }
    } else {
      return { status: 401, message: "no autorizado" };
    }
  } catch (e) {
    return { status: 500, message: "no se que paso pero me caes mal" };
  }
}
```

**Recorrido:**
1. Busca al usuario por email.
2. Si no existe → `401`.
3. `bcrypt.compare("1234", "$2b$10$...")` → bcrypt vuelve a calcular el hash con la contraseña enviada y compara. Devuelve `true` o `false`. (Por eso no hace falta "descifrar").
4. Si coincide → crea un objeto **solo con datos no sensibles** (sin `password`) y fabrica el token.

**¿Por qué el mismo mensaje "no autorizado" si el email no existe y si la contraseña falla?** Para no dar pistas a un atacante sobre qué emails están registrados.

### 🥄 6.4 Ruta y controlador

```js
// user.route.js
router.post("/login", loginUserController);

// user.controller.js
export async function loginUserController(req, res){
  const login = await userService.loginUserService(req)
  res.status(login.status).send(login.message)
}
```

### ✅ Cómo probar
`POST http://localhost:3000/api/user/login`
```json
{ "email": "ana@mail.com", "password": "1234" }
```
- Correcto → `200` y un texto largo tipo `eyJhbGciOi...` → ¡ese es el token! **Cópialo**, lo usaremos ahora.
- Contraseña incorrecta → `401 no autorizado`.
- Pega el token en https://jwt.io y mira los datos de dentro.

### 💥 Qué pasa si…
- **…cambias `tokenKey` en el `.env`** → todos los tokens anteriores dejan de ser válidos (la firma no cuadra). Es la forma de "cerrar todas las sesiones".
- **…no defines `tokenKey`** → `jwt.sign` lanza error ("secretOrPrivateKey must have a value") → `500`.
- **…metes `password` en `tokenUserData`** → cualquiera que vea el token verá el hash. ¡No lo hagas!

📚 **Documentación:** https://jwt.io/introduction · https://www.npmjs.com/package/jsonwebtoken

---

## Paso 7 – El portero: middlewares y ruta protegida

### 🧠 ¿Qué es un middleware?

Es una función que se ejecuta **entre** que llega la petición y que la atiende el controlador. Recibe `(req, res, next)`:
- Si todo va bien → llama a `next()` ("adelante, pase").
- Si no → responde él mismo (`res.status(401)...`) y la petición **no sigue**.

Ya usamos uno sin saberlo: `express.json()`.

### 🥄 7.1 Portero 1 – ¿tienes pulsera? [src/middleware/token.middleware.js](src/middleware/token.middleware.js)

```js
import { validateToken } from "../services/token.service.js";

export function validateUserToken(req, res, next){
    try{
        const token = req.headers.authorization.replace('Bearer ', '')
        validateToken(token)
        next()
    }catch(e){
        res.status(401).send("token no valido")
    }
}
```

- El token viaja en la **cabecera** `Authorization` con el formato estándar `Bearer <token>`.
- `.replace('Bearer ', '')` le quita la palabra para quedarnos solo con el token.
- Si no hay cabecera, `req.headers.authorization` es `undefined` y `.replace` explota → `catch` → `401`. Si el token es falso o fue modificado, `jwt.verify` lanza error → `401`.

### 🥄 7.2 Portero 2 – ¿eres admin? [src/middleware/user.middleware.js](src/middleware/user.middleware.js)

```js
export function roleMiddleware(req, res, next) {
  if (req.body?.rol === "admin") {
    next();
  } else {
    res.status(401).send("no autorizado");
  }
}
```

- `req.body?.rol` → el `?.` (*optional chaining*) evita que explote si `req.body` no existe.
- ⚠️ **Ojo:** aquí el rol lo **envía el propio cliente en el body**. Es didáctico, pero inseguro (cualquiera puede escribir `"rol": "admin"`). Lo correcto se explica en la [sección 14](#14-fallos-que-tiene-la-receta-y-cómo-mejorarla-deberes).

### 🥄 7.3 La ruta con porteros en fila

```js
router.post("/getallusers", validateUserToken, roleMiddleware, getAllUsersController);
```

Express ejecuta **en orden, de izquierda a derecha**: primero el token, luego el rol y solo al final el controlador. Es una **cadena**: si uno no llama a `next()`, los siguientes no se ejecutan.

### 🥄 7.4 Controlador, servicio y modelo

```js
// controller
export async function getAllUsersController(req, res){
  const users = await userService.getAllUsersService()
  res.status(users.status).send(users.message)
}

// service
export async function getAllUsersService() {
  try {
    const users = await userModel.getAllUsersModel();
    return { status: 200, message: users };
  } catch (e) {
    return { status: 403, message: "problemas" };
  }
}

// model
export async function getAllUsersModel(email) {
  const result = db.orm.public.User.where({ email }).all();
  return result;
}
```

- `.all()` → devuelve un **array** con todas las filas que cumplen el filtro.

### ✅ Cómo probar
`POST http://localhost:3000/api/user/getallusers`

| Prueba | Cabecera `Authorization` | Body | Resultado esperado |
|---|---|---|---|
| Sin token | — | `{ "rol": "admin" }` | `401 token no valido` |
| Token inventado | `Bearer abc` | `{ "rol": "admin" }` | `401 token no valido` |
| Token bueno, sin rol | `Bearer eyJ...` | `{}` | `401 no autorizado` |
| Token bueno + admin | `Bearer eyJ...` | `{ "rol": "admin" }` | `200` + lista de usuarios |

En Postman: pestaña **Authorization → Bearer Token** y pegas el token del login.

### 💥 Qué pasa si…
- **…cambias el orden** a `roleMiddleware, validateUserToken` → primero comprueba el rol y luego el token. Funciona, pero haces trabajo inútil; lo lógico es comprobar primero la identidad.
- **…te olvidas de llamar a `next()`** → la petición se queda **colgada** (Postman cargando sin fin).
- **…llamas a `next()` y además `res.send()`** → error *Cannot set headers after they are sent*.
- **…mandas `Bearer` en minúsculas** (`bearer eyJ...`) → `.replace('Bearer ', '')` no lo quita → token inválido.

📚 **Documentación:** https://expressjs.com/en/guide/using-middleware.html

---

## Paso 8 – Ingrediente secreto: vectores (pgvector) y embeddings con Gemini

### 🧠 ¿Qué es un embedding? (explicado sin matemáticas)

Un **embedding** es convertir un texto en una **lista de números** (un vector) que representa su **significado**.

Imagina un mapa: "Madrid" y "capital de España" quedarían en puntos muy cercanos; "plátano" quedaría lejísimos. Con vectores, el ordenador puede medir **cuánto se parecen dos textos aunque no compartan palabras**. A eso se le llama **búsqueda semántica**.

- Gemini genera el vector (768 números en nuestro caso).
- **pgvector** permite guardarlo en PostgreSQL y buscar "los más cercanos".

### 🥄 8.1 Instalar

```bash
npm install @google/genai @prisma/orm-extension-pgvector
```

### 🥄 8.2 Añadir la extensión a Prisma
- En `prisma.config.ts`: `import pgvector from '@prisma/orm-extension-pgvector/control'` y `extensions: [pgvector]`.
- En `src/prisma/db.ts`: `import pgvector from '@prisma/orm-extension-pgvector/runtime'` y `extensions: [pgvector]`.

**¿Por qué en dos sitios?** `control` lo usa la CLI para **instalar** la extensión en la base de datos (`CREATE EXTENSION vector`). `runtime` lo usa tu app para **leer, escribir y buscar** vectores.

### 🥄 8.3 Añadir la columna al contrato

```prisma
types {
  Embedding768 = pgvector.Vector(768)
}

model User {
  ...
  embedding Embedding768?
}
```

Y regenerar + migrar:
```bash
npx prisma contract emit
npx prisma migration plan
npx prisma db migrate
```

### 🧯 La historia del "vector_fix" (una lección real)

Al principio la columna se creó como **`vector(1536)`** (1536 números es el tamaño típico de otros modelos de embeddings). Pero Gemini lo configuramos para devolver **768**. Guardar un vector de 768 en una columna de 1536 **da error**: las dimensiones deben coincidir **exactamente**.

Solución: cambiar el contrato a `Vector(768)` y crear la migración `20261113T1030_vector_fix`, que hace:

```ts
this.alterColumnType({
  schema: 'public', table: 'User', column: 'embedding',
  type: 'vector(768)',
  // los vectores de 1536 no se pueden convertir a 768: se borran y se regeneran
  using: 'NULL::vector(768)',
})
```

**Moraleja:** el número del contrato (`Vector(768)`) y el `outputDimensionality: 768` de Gemini **tienen que ser el mismo**. Si cambias uno, cambia el otro (y haz migración).

### 🥄 8.4 El servicio de embeddings: [src/services/embedding.service.js](src/services/embedding.service.js)

```js
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

export async function embedding(data) {
  const ai = new GoogleGenAI({ apiKey: process.env.googleApiKey });
  const response = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents: `${data}`,
    config: { outputDimensionality: 768 },
  });
  return response.embeddings[0].values
}
```

| Fragmento | Explicación |
|---|---|
| `new GoogleGenAI({ apiKey })` | Crea el cliente de Gemini con tu clave |
| `model: "gemini-embedding-2"` | El modelo de Google que convierte texto en vectores |
| `contents: \`${data}\`` | El texto a convertir. Se usan **backticks** (template literal) para forzar que sea texto. **Solo admite texto** |
| `outputDimensionality: 768` | Pedimos vectores de 768 números (debe coincidir con el contrato) |
| `response.embeddings[0].values` | La respuesta trae una lista de embeddings; cogemos el primero (`[0]`) y su array de números (`values`) |

### 🥄 8.5 Usarlo al registrar

En `registerUserService` se añadió:

```js
const embeddingData = await embedding(req.body);

await userModel.registerUserModel(email, password, name, username, address, embeddingData);
```

Y el modelo recibe un sexto parámetro `embedding` que guarda en la columna.

> ⚠️ **Hay un fallo aquí que merece la pena entender** (ver [sección 14](#14-fallos-que-tiene-la-receta-y-cómo-mejorarla-deberes)): `req.body` es un **objeto**, y `` `${objeto}` `` en JavaScript se convierte en el texto **`"[object Object]"`**. Es decir, ¡todos los usuarios reciben el vector de la frase "[object Object]"! Pruébalo en la consola del navegador: `` `${{a:1}}` ``.

### ✅ Cómo probar
1. Registra un usuario nuevo (Paso 5).
2. En Supabase → Table Editor → `User` → la columna `embedding` debe tener una lista larga de números.
3. Para ver el vector en consola, puedes descomentar/añadir temporalmente `console.log(embeddingData.length)` → debe imprimir `768`.

### 💥 Qué pasa si…
- **…la `googleApiKey` es incorrecta** → Gemini responde error → el registro cae en el `catch` → `400 Error al crear usuario` (mira la consola: hay un `console.log(e)`).
- **…pones `outputDimensionality: 512`** → el vector no cabe en `vector(768)` → error al guardar.
- **…pasas un objeto sin backticks** → el SDK puede rechazarlo o malinterpretarlo: `contents` debe ser texto.

📚 **Documentación:** https://ai.google.dev/gemini-api/docs/embeddings · https://github.com/pgvector/pgvector · `node_modules/@prisma/orm-extension-pgvector/README.md`

---

## Paso 9 – El postre: búsqueda semántica + reranker de Jina

### 🧠 La idea

El usuario escribe una frase libre: *"busco a alguien que viva por el centro de Madrid"*. Queremos devolver el usuario que mejor encaje. Lo hacemos en **dos fases**, como un concurso de cocina:

1. **Preselección (pgvector)** → rápido y "a grandes rasgos": ordena a todos los usuarios por cercanía de su vector al vector de la pregunta.
2. **Final con jurado (reranker de Jina)** → un modelo más preciso lee la pregunta y cada dirección, y elige la mejor.

**¿Por qué dos fases?** La búsqueda por vectores es muy rápida pero algo tosca; el reranker es muy preciso pero más lento/caro. Combinados: rápido **y** preciso. Es la técnica habitual en sistemas **RAG**.

### 🥄 9.1 El modelo: buscar los vecinos más cercanos

```js
export async function getVerctorUserModel(embedding){
  const nearest = await db.orm.public.User.using.embedding_nearest(embedding).all();
  return nearest
}
```

**¿De dónde sale `embedding_nearest`?** ¡No lo hemos escrito nosotros! La extensión pgvector de Prisma **crea automáticamente** un método `<nombreDelCampo>_nearest` por cada campo vector del modelo. Como nuestro campo se llama `embedding`, el método se llama `embedding_nearest`. Si el campo se llamara `vector`, sería `vector_nearest`.

- Ordena las filas por **distancia coseno** (cuanto más pequeña, más parecidas), de la más cercana a la más lejana.
- `.all()` devuelve todas ordenadas. (Los usuarios sin vector salen al final.)
- La extensión también admite una distancia máxima (`maxDistance`) para filtrar; mira su tipo en `node_modules/@prisma/orm-extension-pgvector/dist/runtime.d.mts`.

### 🥄 9.2 El reranker: `reranker` en [src/services/embedding.service.js](src/services/embedding.service.js)

```js
export async function reranker(request, queryData){
 return fetch('https://api.jina.ai/v1/rerank', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.jinaApiKey}`
  },
  body: JSON.stringify({
    documents: queryData,                          // lista de textos candidatos
    model: 'jina-reranker-v2-base-multilingual',   // multilingüe → entiende español
    query: request,                                // la pregunta del usuario
    return_documents: true,                        // que devuelva también el texto
    top_n: 1                                       // solo el mejor
  })
})
}
```

- `fetch` es la función nativa (viene con Node, no hay que instalarla) para hacer peticiones HTTP **desde nuestro servidor a otro servidor**.
- Fíjate: Jina **también** usa `Authorization: Bearer ...`, igual que nuestra API con JWT. Es un estándar.
- `JSON.stringify` convierte el objeto JS en texto JSON para enviarlo.
- Devuelve la **respuesta cruda**; por eso luego hacemos `.json()`.

### 🥄 9.3 El chef: `getUserService`

```js
export async function getUserService(req) {
  const request = req.body.solcitud
  const queryVector = await embedding(request);
  const nearest = await userModel.getVerctorUserModel(queryVector);
  const queryData = nearest.map((item) => {
    return item.address
  })
  const respuesta = await reranker(request, queryData)
  return await respuesta.json();
}
```

Paso a paso:
1. `req.body.solcitud` → la frase del usuario. ⚠️ El campo se llama **`solcitud`** (sin la "i"); en Postman debes escribirlo **exactamente así**.
2. `embedding(request)` → convierte la frase en vector de 768.
3. `getVerctorUserModel(queryVector)` → usuarios ordenados por parecido.
4. `.map(item => item.address)` → **transforma** el array de usuarios en un array de **solo direcciones**: `["Calle Mayor 1, Madrid", "Av. Diagonal 3, Barcelona", ...]`.
5. `reranker(...)` → Jina elige la dirección más relevante.
6. `respuesta.json()` → convierte la respuesta de Jina en objeto JS y se devuelve.

### 🥄 9.4 Ruta y controlador

```js
// route
router.post("/getuser", getUserController);

// controller
export async function getUserController(req, res){
  res.status(200).send(await userService.getUserService(req))
}
```

### ✅ Cómo probar
1. Registra 3 o 4 usuarios con direcciones distintas (Madrid, Barcelona, Sevilla…).
2. `POST http://localhost:3000/api/user/getuser`
```json
{ "solcitud": "alguien que viva en la capital de Cataluña" }
```
3. Respuesta esperada (forma aproximada de Jina):
```json
{
  "model": "jina-reranker-v2-base-multilingual",
  "results": [
    { "index": 1, "document": { "text": "Av. Diagonal 3, Barcelona" }, "relevance_score": 0.8 }
  ],
  "usage": { "total_tokens": 123 }
}
```
Fíjate: la frase no dice "Barcelona" y aun así la encuentra. ¡Eso es búsqueda semántica! 🎉

### 💥 Qué pasa si…
- **…escribes `"solicitud"` (bien escrito) en Postman** → `req.body.solcitud` es `undefined` → se hace embedding de `"undefined"` → resultados sin sentido.
- **…cambias `top_n: 1` por `top_n: 3`** → devuelve el podio de 3.
- **…algún usuario no tiene `address`** → en `documents` irá un `null`, y Jina puede rechazar la petición.
- **…la `jinaApiKey` es mala** → Jina responde un error (401) y eso es lo que verás devuelto.
- **…Gemini falla** → como esta función **no tiene `try/catch`**, la petición se queda sin respuesta correcta (ver sección 14).

📚 **Documentación:** https://jina.ai/reranker · `Array.prototype.map`: https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Array/map · `fetch`: https://developer.mozilla.org/es/docs/Web/API/Fetch_API

---

## 12. El viaje de un dato

Sigamos al **email** de Ana durante un registro, de principio a fin. Esto es lo que en programación se llama **flujo de datos**:

```
1. Postman      →  body JSON: { "email": "ana@mail.com", ... }
2. index.js     →  express.json() lo convierte en  req.body.email
3. user.route   →  POST /register  → llama a registerUserController(req, res)
4. controller   →  pasa `req` entero a  registerUserService(req)
5. service      →  let { email } = req.body       ← aquí nace la variable `email`
                   la pasa como 1er argumento a registerUserModel(email, ...)
6. model        →  recibe el parámetro `email`
                   db.orm.public.User.create({ email })   → { email: email }
7. db.ts        →  traduce a SQL: INSERT INTO "User"("email", ...) VALUES ($1, ...)
8. Supabase     →  guarda la fila. Si ya existía → error 23505
9. ⬆ vuelta     →  model devuelve `created` → service devuelve {status:201, message}
                   → controller hace res.status(201).send("usuario registrado")
10. Postman     ←  ve "201 usuario registrado"
```

**Reglas de oro que se ven en este viaje:**
- **Hacia abajo** viajan los **datos** (req → variables → argumentos → columnas).
- **Hacia arriba** viajan los **resultados** (filas → `{status, message}` → respuesta HTTP).
- Cada capa solo conoce a su vecina inmediata. El modelo no sabe que existe Postman; el controlador no sabe que existe SQL.

---

## 13. ¿Qué pasa si…?

Experimentos para hacer **a propósito** y aprender leyendo los errores (¡leer errores es el 50 % del oficio!):

| Experimento | Qué esperar | Lección |
|---|---|---|
| Quitar `.js` en un import propio | `ERR_MODULE_NOT_FOUND` | En ES Modules la extensión es obligatoria |
| Borrar `import 'dotenv/config'` de `index.js` | `port` cae a 3000 por el `\|\|` | Los valores por defecto salvan |
| Quitar un `await` en el service de login | `userData` es una Promise, `userData.password` es `undefined` → bcrypt falla → 500 | `await` es imprescindible con código asíncrono |
| Cambiar `export function` por `function` en el controller | `does not provide an export named ...` | Lo que no se exporta no se puede importar |
| Cambiar `router.post` por `router.get` en `/register` | En Postman con POST: `404 Cannot POST` | Método y ruta deben coincidir |
| Quitar `@unique` del email, emitir y migrar | Se permiten duplicados; el 409 desaparece | Las reglas de datos viven en la base de datos |
| Cambiar `Vector(768)` a `Vector(1024)` sin cambiar Gemini | Error al guardar el vector | Las dimensiones deben coincidir |
| Modificar a mano una letra del token | `401 token no valido` | La firma JWT protege contra manipulaciones |
| Escribir mal la `DATABASE_URL` | Error de conexión en la primera consulta | Revisa siempre el `.env` primero |

---

## 14. Fallos que tiene la receta y cómo mejorarla (deberes)

Este proyecto es un **repaso de clase**: funciona, pero tiene cosas mejorables. Detectarlas es un ejercicio excelente.

1. **El embedding del registro es siempre `"[object Object]"`.**
   `embedding(req.body)` convierte el objeto en el texto `"[object Object]"`, así que todos los usuarios tienen **el mismo** vector y la primera fase de la búsqueda no aporta nada (el que realmente trabaja es el reranker). Además, si se arreglara con `JSON.stringify(req.body)`, se estaría enviando **la contraseña** a Google.
   ✅ Mejor: `await embedding(address)` o un texto descriptivo sin datos sensibles, por ejemplo `` `${name} vive en ${address}` ``.

2. **El rol de admin lo decide el cliente.** `roleMiddleware` mira `req.body.rol`, y cualquiera puede mandar `"rol": "admin"`.
   ✅ Mejor: añadir una columna `role` al modelo `User`, meter el rol **dentro del token** en el login, y que `validateUserToken` guarde el resultado de `validateToken(token)` en `req.user` para que `roleMiddleware` compruebe `req.user.role`.

3. **Los tokens no caducan.** ✅ `jwt.sign(userData, tokenKey, { expiresIn: '1h' })`.

4. **`getAllUsersModel(email)` se llama sin `email`.** Filtrar por `{ email: undefined }` no es claro.
   ✅ Mejor no usar `where`, y además **no devolver la contraseña ni el embedding** al cliente (seleccionar solo los campos necesarios).

5. **`getUserService` no tiene `try/catch`.** Si Gemini o Jina fallan, Express 5 captura el error pero el cliente recibe un 500 genérico. ✅ Añadir `try/catch` y devolver `{status, message}` como en el resto de servicios (y que el controlador use `response.status`).

6. **`getVerctorUserModel` trae a todos los usuarios.** Con miles de usuarios sería lento. ✅ Limitar a los N más cercanos o usar `maxDistance`.

7. **Pequeñas erratas de nombres:** `solcitud` → `solicitud`, `getVerctorUserModel` → `getVectorUserModel`, `port` → `PORT`. Cambiar un nombre implica cambiarlo **en todos los sitios donde se usa** (usa F2 "Rename Symbol" en VS Code).

8. **Validar los datos de entrada:** que el email tenga formato de email y la contraseña una longitud mínima, antes de tocar la base de datos (librerías como `zod` o `express-validator`).

9. **Mensajes de error y códigos HTTP**: `403 "problemas"` en `getAllUsersService` debería ser un `500` (error del servidor), y el mensaje del login de error 500 mejor algo neutro 😉.

10. **El `.env.example`** solo lista `DATABASE_URL`: añade también `port`, `tokenKey`, `googleApiKey` y `jinaApiKey` (sin valores) para que quien clone el proyecto sepa qué necesita.

---

## 15. Chuleta final

### Para replicar el proyecto desde cero (resumen)

```bash
# 1. Proyecto
mkdir repaso_supabase && cd repaso_supabase
git init
npm init -y                     # y añadir "type": "module" + scripts

# 2. Dependencias
npm install express dotenv bcrypt jsonwebtoken @google/genai @prisma/orm-postgres @prisma/orm-extension-pgvector
npm install -D nodemon prisma @prisma/cli-engine @types/node

# 3. Prisma
npx prisma orm init             # crea config, contrato y db.ts
# editar src/prisma/contract.prisma y prisma.config.ts
npx prisma contract emit
npx prisma migration plan
npx prisma db migrate

# 4. Arrancar
npm run dev
```

### Si clonas este repositorio ya hecho

```bash
git clone <url-del-repo>
cd repaso_supabase
npm install                     # descarga node_modules según package-lock.json
# crear .env a partir de .env.example y rellenar las 5 variables
npx prisma db migrate           # crea las tablas en TU base de datos
npm run dev
```

### Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor con autorrecarga |
| `npm start` | Servidor normal |
| `npx prisma contract emit` | Regenerar `contract.json` / `contract.d.ts` |
| `npx prisma migration plan` | Crear una migración a partir de los cambios del contrato |
| `npx prisma db migrate` | Aplicar migraciones pendientes |
| `npx prisma migration status` | Ver estado de migraciones |
| `npx prisma <comando> --help` | Ayuda de cualquier comando |

### Tabla de rutas para probar

| Método | URL | Cabeceras | Body de ejemplo |
|---|---|---|---|
| POST | `/api/user/register` | — | `{ "email", "password", "name", "username", "address" }` |
| POST | `/api/user/login` | — | `{ "email", "password" }` |
| POST | `/api/user/getallusers` | `Authorization: Bearer <token>` | `{ "rol": "admin" }` |
| POST | `/api/user/getuser` | — | `{ "solcitud": "frase en lenguaje natural" }` |

### 📚 Dónde buscar documentación

| Tema | Enlace |
|---|---|
| JavaScript en general (la biblia) | https://developer.mozilla.org/es/ |
| Node.js | https://nodejs.org/docs |
| npm | https://docs.npmjs.com |
| Express | https://expressjs.com |
| Supabase | https://supabase.com/docs |
| PostgreSQL | https://www.postgresql.org/docs/ |
| Prisma 8 | [prisma-8.md](prisma-8.md) en este repo, https://www.prisma.io/docs y `npx prisma --help` |
| pgvector | https://github.com/pgvector/pgvector |
| bcrypt | https://www.npmjs.com/package/bcrypt |
| JWT | https://jwt.io/introduction · https://www.npmjs.com/package/jsonwebtoken |
| Gemini embeddings | https://ai.google.dev/gemini-api/docs/embeddings |
| Jina Reranker | https://jina.ai/reranker |
| Códigos de estado HTTP | https://developer.mozilla.org/es/docs/Web/HTTP/Status |

> 💡 **Consejo para buscar documentación:** busca siempre en la **documentación oficial** primero, fíjate en la **versión** (Express 5 vs 4, Prisma 8 vs 6…), y cuando un paquete de `node_modules` tenga un `README.md`, léelo: suele ser la fuente más fiable para la versión exacta que tienes instalada.

---

¡Buen provecho! 🍽️ Si algo no funciona, recuerda el orden para investigar: **1)** lee el error completo en la terminal, **2)** revisa el `.env`, **3)** revisa que el nombre de cada variable coincida en todas las capas, **4)** prueba la capa más baja aislada (¿está la tabla en Supabase?) y sube desde ahí.
