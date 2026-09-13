# Prompt: Wishlist App (estanix-wishlist)

## Contexto y metodología

Vas a construir una nueva aplicación llamada **wishlist app** usando **SDD (Spec-Driven Development)**. Esto significa que, antes de escribir código, debes:

1. Leer y entender la estructura de los proyectos existentes **`dcuero-app`** y **`dcuero-iac`** (accesibles en mi entorno local). Estos dos proyectos **no tienen relación funcional ni de negocio con este proyecto** — se usan únicamente como **referencia de estructura**: convenciones de código, estructura de carpetas, patrones de configuración de CI/CD y de Terraform, forma de organizar los workflows de GitHub Actions, forma de pasar variables de entorno a Vercel, etc. Todo lo específico de este proyecto (nombre, recursos, flujo de negocio) es propio y distinto.
2. Producir primero una **especificación formal** (spec) del sistema: modelo de datos, contratos de API, rutas, componentes, criterios de aceptación por feature. No escribas código de implementación hasta que la spec esté completa y validada conmigo.
3. A partir de la spec, generar un **plan de implementación** dividido en fases/tareas verificables (cada tarea con su criterio de "done").
4. Implementar fase por fase, validando contra la spec en cada paso (tests, revisión manual, criterios de aceptación) antes de avanzar a la siguiente.
5. Mantener la spec como fuente de verdad: si algo cambia durante la implementación, la spec se actualiza primero y luego el código.

No asumas nada sobre convenciones: si `dcuero-app` o `dcuero-iac` tienen un patrón establecido (naming, estructura de carpetas, forma de manejar env vars, forma de estructurar los workflows de GitHub Actions, forma de estructurar los módulos de Terraform, etc.), este proyecto debe replicar el **patrón/estructura**, no inventar uno nuevo.

---

## 1. Repos de referencia (solo estructura, no relacionados con este proyecto)

- **`dcuero-app`**: léelo primero. Es la referencia de stack (Next.js + Tailwind), estructura de carpetas, convenciones de componentes, configuración de lint/format, estructura del pipeline de GitHub Actions (CI en PRs, CD en push a trunk), y en particular **cómo se pasan las variables de entorno a Vercel** (script que lee parámetros de SSM y los inyecta al entorno de Vercel — ver sección 3.4).
- **`dcuero-iac`**: léelo primero. Es la referencia de cómo se organiza el código de Terraform (módulos, environments, naming de recursos, forma de manejar el backend remoto de state, forma de estructurar el bootstrap con el OIDC de GitHub hacia AWS, roles y policies).

Si algo en este prompt entra en conflicto con lo que encuentres en esos repos, prioriza replicar el patrón/estructura que usan y pregúntame antes de asumir. Insisto: son solo ejemplos de estructura, ningún nombre, recurso o convención específica de negocio de esos proyectos aplica aquí.

---

## 2. Repo del proyecto

**Un único repo, ya creado: `estanix-wishlist`.** A diferencia de `dcuero-app`/`dcuero-iac` (que están separados), aquí el código de infraestructura (Terraform) y el código de la aplicación (Next.js) viven **en el mismo repo**, en carpetas separadas. Estructura de alto nivel esperada (ajustar a lo que tenga sentido tras leer los repos de referencia):

```
estanix-wishlist/
├── app/            # Next.js + Tailwind (o "src/", según convención de dcuero-app)
├── iac/            # Terraform (o "infra/", "terraform/", según convención de dcuero-iac)
│   ├── bootstrap/  # OIDC de GitHub hacia AWS, roles, permisos iniciales
│   └── ...         # módulos, recursos de la app (DynamoDB, etc.)
├── .github/
│   └── workflows/  # ci.yml, cd.yml (o pr.yml/cd.yml según convención)
└── ...
```

- **App**: Next.js + Tailwind CSS, mismas convenciones que `dcuero-app` (App Router si aplica, `tsconfig`, ESLint/Prettier, estructura de `/app`, `/components`, `/lib`, etc.). Deploy en **Vercel**.
- **IaC**: Terraform, backend remoto en S3: bucket **`central-tfstate-estanix-871696174477`**, con su propio key/path para el state de este proyecto (seguir convención de naming de keys de `dcuero-iac`). Estructura de carpetas/módulos igual a `dcuero-iac`.
  - Carpeta **`bootstrap/`**: código Terraform necesario para el bootstrap inicial — conexión OIDC de GitHub Actions hacia AWS (identity provider), roles IAM y policies que el pipeline asume para `terraform plan/apply` y para permisos sobre DynamoDB/SSM/etc. Replicar el patrón de `dcuero-iac/bootstrap` en cuanto a naming, trust policy y permisos mínimos necesarios.
  - Recursos de la aplicación (fuera de bootstrap): tabla **DynamoDB** para los wishes (ver modelo de datos en la sección 5), y cualquier recurso adicional necesario (ej. parámetros en SSM para las env vars de la app — ver sección 3.4).

### 2.1 Pipeline de CI/CD (en el mismo workflow/repo)

- **CI**: se ejecuta en cada **PR** contra `main`, y también como parte del **CD** (o sea, siempre corre antes de aplicar cambios). Incluye lint, typecheck, build, tests (app) y `terraform fmt`/`validate`/`plan` (iac), según lo que haga `dcuero-app`/`dcuero-iac`.
- **CD**: se ejecuta en push a `main` (trunk), **después de que CI pase**, con el siguiente orden:
  1. **`terraform apply`** sobre la carpeta de IaC (aplicando cambios de infraestructura, ej. la tabla DynamoDB, parámetros SSM, etc.), usando el rol OIDC configurado en el bootstrap.
  2. **Deploy a Vercel** de la app, una vez la infraestructura está aplicada (para asegurar que cualquier recurso nuevo, como un parámetro SSM, exista antes de que la app lo necesite).
- **PR pipeline**: validaciones en cada PR (CI descrito arriba; `terraform plan` como parte de la validación de IaC; opcionalmente preview deploy de Vercel si `dcuero-app` lo hace).
- Replicar el naming y estructura de los workflows de `dcuero-app`/`dcuero-iac`, adaptando a que todo vive en un solo repo (por ejemplo, un único `cd.yml` con un job de terraform y luego un job de deploy a Vercel que depende del anterior, en vez de dos pipelines en dos repos).

---

## 3. Flujo de contribución (trunk-based development)

El repo `estanix-wishlist` (app + iac juntos) usa **trunk-based development**:

- Una única rama larga (**trunk**, `main`), siempre desplegable.
- Nada de ramas de larga duración tipo `develop`/`release`. Todo trabajo se hace en **ramas cortas** creadas desde `main`, con un scope pequeño (idealmente una sola feature/fix/chore), y se integra vía **PR directo a `main`** apenas está listo — sin pasos intermedios.
- **`main` está protegida: prohibidos los pushes directos.** Todo cambio, sin excepción (incluyendo cambios de IaC y cambios de configuración), debe entrar vía PR. Configurar la protección de rama en GitHub (branch protection rule sobre `main`) exigiendo al menos: PR requerido antes de mergear, CI en verde antes de poder mergear, y sin permitir bypass para nadie (incluido el admin del repo, salvo que `dcuero-app`/`dcuero-iac` tengan una excepción documentada que debamos replicar).
- Antes de definir el detalle, revisar si `dcuero-app`/`dcuero-iac` ya siguen esta convención (rama protegida, reglas de merge, si exigen squash merge, etc.) y replicarla. Si no está definida ahí, usar lo siguiente:

### 3.1 Naming de ramas

Formato: `<tipo>/<descripcion-corta-en-kebab-case>`

Tipos permitidos: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `ci`, `infra` (este último para cambios en la carpeta de Terraform del repo).

Ejemplos:
- `feat/shared-wish-detail-page`
- `fix/reserve-race-condition`
- `chore/update-tailwind-config`
- `infra/dynamodb-table-module`
- `ci/add-pr-workflow`

### 3.2 Naming de commits (Conventional Commits)

Formato: `<tipo>(<scope opcional>): <descripción en minúscula, imperativo>`

Mismos tipos que las ramas: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `ci`, `infra` (y `style` para cambios puramente visuales/formato si aplica).

Ejemplos:
- `feat(shared): add reserve confirmation modal`
- `fix(api): use conditional update to prevent double reservation`
- `infra(dynamodb): add atomic counter item for visits`
- `ci: run terraform plan on pull_request`

Commits deben ser pequeños y atómicos, coherentes con el scope reducido de cada rama.

### 3.3 Naming de PRs

Título del PR: mismo formato que el commit principal (Conventional Commits), ej. `feat(shared): add wish detail page`.

El cuerpo del PR debe incluir, como mínimo:
- Breve descripción del cambio y por qué.
- Referencia a la fase/tarea de la spec o plan de implementación a la que corresponde (ver sección 9).
- Checklist de validación manual si aplica (ej. "probado en mobile", "probado el flujo de reserva concurrente").

Los PRs deben ser **pequeños** (idealmente revisables en minutos, no en horas) para mantener el ritmo de trunk-based development; si una feature es grande, se debe dividir en varios PRs incrementales en vez de una rama larga con un solo PR gigante.

### 3.4 Variables de entorno de la app (SSM → Vercel)

Las variables de entorno necesarias para que la app funcione (nombre de tabla DynamoDB, región AWS, credenciales/rol, etc.) **no se cargan manualmente en Vercel**: se gestionan igual que en `dcuero-app` —

- Se definen/almacenan como **parámetros en AWS SSM Parameter Store**.
- Un **script** (replicar el que use `dcuero-app`, mismo lenguaje/herramienta — ej. bash o Node — y mismo punto del pipeline en que se ejecuta) lee esos parámetros de SSM y los inyecta como variables de entorno del proyecto en **Vercel** (vía Vercel CLI/API), como parte del job de deploy en el CD.
- **Prefijo de los parámetros SSM para este proyecto: `estanix-wishlist`** (ej. `/estanix-wishlist/dynamodb-table-name`, `/estanix-wishlist/aws-region`, etc. — seguir el formato exacto de path/naming que use `dcuero-app` para sus parámetros, solo cambiando el prefijo por `estanix-wishlist`).
- Los parámetros en sí (y los permisos IAM para leerlos desde el pipeline) se crean vía Terraform, como parte de los recursos del repo (sección 2), y deben estar disponibles antes del paso de deploy a Vercel — de ahí el orden `terraform apply` → deploy a Vercel descrito en la sección 2.1.

---

## 4. Concepto general de la app

Un wishlist personal con dos vistas:

- **`/shared`**: vista pública (para las personas con quienes comparto el link) donde se ven mis deseos ("wishes") y se pueden "reservar" regalos para evitar duplicados.
- **`/me`**: vista privada/administrativa donde yo gestiono (creo/edito/elimino) los wishes y veo estadísticas (visitas, reservas).

Diseño: **minimalista, dark theme, con animaciones sutiles, altamente responsive (mobile-first) y fácil de usar.**

---

## 5. Modelo de datos

Cada **wish** (deseo) tiene una o más **opciones** (alternativas concretas de ese regalo — por ejemplo, "una bicicleta" como wish, con opciones "Bicicleta X en tienda A" y "Bicicleta Y en tienda B").

Estructura propuesta para DynamoDB (mejórala si tienes una idea mejor, pero mantén esta forma general):

```
Wish {
  id: string (PK, uuid)
  title: string
  description: string
  oneIsEnough: boolean       // si true: una sola opción reservada marca el wish completo como reservado
  reservable: boolean        // si false: nadie puede reservar (ni el wish ni sus opciones)
  createdAt: string (ISO)
  updatedAt: string (ISO)
  order: number              // opcional, para poder ordenar los wishes manualmente en /me
  options: [
    {
      id: string (uuid)
      title: string
      description: string
      imageUrl: string
      link: string            // url de "Ir al sitio"
      reserved: boolean
      reservedAt: string (ISO) | null
    }
  ]
}
```

Notas de diseño a validar/mejorar conmigo en la fase de spec:
- Evaluar si conviene modelar `options` como sub-lista embebida (más simple, buena para pocos ítems por wish) vs. ítems separados en la misma tabla con un `PK`/`SK` tipo single-table design (mejor para updates atómicos de un solo option sin traer/reescribir todo el wish). Dado que las reservas deben poder hacerse concurrentemente por varios visitantes, **recomiendo single-table design** con `PK = WISH#<id>` y `SK = METADATA` para el wish y `SK = OPTION#<id>` para cada opción, de forma que reservar una opción sea un **update atómico condicional** (`ConditionExpression: attribute_not_exists / reserved = false`) sin necesidad de leer y reescribir el wish completo. Justifica en la spec cuál eliges y por qué.
- Contador atómico de visitas: un ítem separado (`PK = COUNTER#shared-visits`, `SK = METADATA`) con `ADD` atómico (`UpdateExpression: ADD visits :inc`) para evitar condiciones de carrera.
- `reservedBy` no se almacena (no hay autenticación de visitantes), solo el estado `reserved`.

---

## 6. `/shared` — vista pública

### 5.1 `/shared` (listado principal)

- Grid de **cards**, una por wish, mostrando:
  - Título
  - Descripción (truncada si es muy larga)
  - Un **mini grid de imágenes** con las imágenes de las opciones de ese wish (preview, no clickeables individualmente aquí)
  - Botón **"Ver detalles"** (y la card completa también es clickeable) que lleva a `/shared/:wishId`
  - Si `oneIsEnough = true` y **alguna** opción está reservada: la card muestra una **banda diagonal** en la esquina diciendo **"YA RESERVADO"**.
  - Si `oneIsEnough = false`: la card **no** muestra la banda de reservado (el estado de reserva se ve a nivel de opción, dentro de `/shared/:wishId`), salvo que quieras indicar visualmente "algunas opciones reservadas" de forma sutil (a definir en spec, no bloqueante).
- Al entrar a `/shared`, se debe incrementar el contador atómico de visitas en DynamoDB **una sola vez por visitante**:
  - Al cargar la página, revisar si existe una key en `localStorage` (ej. `wishlist_visit_counted = true`).
  - Si no existe, llamar al endpoint que hace `ADD` atómico sobre el contador, y luego setear la key en `localStorage`.
  - Si ya existe, no volver a contar.

### 5.2 `/shared/:wishId` (detalle del wish)

- Muestra título y descripción completos del wish.
- **Si el wish tiene una sola opción** (`options.length === 1`), **no se muestra como card independiente**: sus datos (imagen, descripción, link) se integran directamente en el layout de la página del wish (no hay redundancia de título/tarjeta), pero el botón "Regalaré esto" y el link "Ir al sitio" se mantienen.
- **Si tiene varias opciones**, cada una se muestra como una **card de opción** con:
  - Imagen (la imagen es también parte del contenido navegable: al hacer click en la imagen o en el botón, se abre `link` en una nueva pestaña).
  - Título de la opción.
  - Descripción de la opción.
  - Botón **"Ir al sitio"** con ícono (ej. ícono de link externo / flecha saliente), que abre `option.link` en nueva pestaña (`target="_blank" rel="noopener noreferrer"`).
  - Botón **"Regalaré esto"** (solo visible/habilitado si `wish.reservable === true` y la opción no está reservada).
  - Si la opción está `reserved = true`:
    - Si `oneIsEnough = false`: esa card específica muestra la banda diagonal **"OPCIÓN RESERVADA"**, y su botón "Regalaré esto" desaparece o se deshabilita; las demás opciones del mismo wish siguen disponibles.
    - Si `oneIsEnough = true`: en cuanto **cualquier** opción se reserva, **todas** las opciones de ese wish pasan a mostrarse como no disponibles (banda "YA RESERVADO" en cada una, o un mensaje a nivel de página + deshabilitar todos los botones — definir en spec cuál se ve mejor visualmente, probablemente un mensaje único a nivel de página es más limpio que repetir la banda en cada card).
- Si `wish.reservable === false`: no se muestra ningún botón "Regalaré esto" en ninguna opción (son solo informativas).

### 5.3 Flujo de reserva ("Regalaré esto")

1. El visitante hace click en **"Regalaré esto"** sobre una opción.
2. Aparece un **modal/floating window custom** (no el `confirm()` nativo del navegador) con:
   - Texto: **"¿Estás seguro?"**
   - Botón **"Sí"**
   - Botón **"Volver"**
3. Si hace click en **"Volver"**: se cierra el modal, no pasa nada.
4. Si hace click en **"Sí"**:
   - Se llama a un endpoint de la API que hace un **update condicional atómico** en DynamoDB (`reserved: false → true`), para evitar condiciones de carrera si dos personas reservan al mismo tiempo. Si la condición falla (ya estaba reservado), se debe mostrar un mensaje de error ("Alguien más acaba de reservar esto") y refrescar el estado.
   - Si el update es exitoso:
     - Se guarda el estado localmente: en **`localStorage`** (persistente) y en **`sessionStorage`** (para la sesión actual) una entrada que identifique qué opción(es) reservó este visitante (ej. `{ wishId, optionId, reservedAt }`), de forma que si el visitante recarga la página o cierra y abre el navegador, pueda ver "esto lo reservé yo" (esto es solo informativo para el propio visitante; el estado real y compartido vive en DynamoDB).
     - La UI se actualiza optimistamente (o tras confirmación del servidor) mostrando la banda **"YA RESERVADO"** / **"OPCIÓN RESERVADA"** según corresponda.
   - El listado (`/shared` y `/shared/:wishId`) debe reflejar el estado real de DynamoDB para **todos** los visitantes (no solo para quien reservó), típicamente refrescando en cada carga de página (no hace falta websockets/tiempo real, con fetch en cada navegación/carga basta, a validar en spec).

---

## 7. `/me` — vista privada de administración

> Nota para la spec: definir cómo se protege esta ruta (auth). Al mínimo, algo simple (basic auth, password compartida por env var, o un login sencillo) — replicar si `dcuero-app` ya tiene un patrón de auth; si no, proponer el más simple que sea razonable y validarlo conmigo antes de implementar.

Funcionalidad:

- **Ver** todos los wishes existentes (con sus opciones).
- **Agregar** un nuevo wish (formulario: título, descripción, `oneIsEnough`, `reservable`, y sus opciones — cada opción con título, descripción, imagen, link).
- **Editar** un wish existente y sus opciones.
- **Eliminar** un wish (y sus opciones) o eliminar una opción individual.
- **Ver estadísticas**:
  - Número total de visitas al `/shared` (leído del contador atómico).
  - Listado de qué opciones/wishes están reservados actualmente.
- **Botón "Resetear reservaciones"**: acción destructiva que pone `reserved = false` en **todas** las opciones de **todos** los wishes.
  - Al hacer click, aparece el mismo tipo de **modal custom** de confirmación: **"¿Estás seguro?"** / **"Sí"** / **"Volver"**.
  - Si confirma, se ejecuta un batch update en DynamoDB reseteando todas las opciones.
  - Nota: esto **no** borra el `localStorage`/`sessionStorage` de los visitantes automáticamente (no hay forma de hacerlo desde el servidor); es un tradeoff aceptado — dejar esto documentado en la spec.
- Manejo de imágenes: definir en la spec si las imágenes se suben directamente (requeriría S3 + upload) o si por ahora solo se pega una URL externa de imagen (más simple, recomendado para el MVP). Empezar por **URL externa** salvo que me indiques lo contrario.

---

## 8. Estilo y UX

- **Dark theme** por defecto (sin necesidad de light mode en el MVP, salvo que se decida agregarlo después).
- Minimalista: tipografía clara, espaciado generoso, paleta reducida de colores con un acento.
- **Animaciones** sutiles: transiciones al hacer hover en cards, aparición del modal con fade/scale, transición al marcar algo como reservado (ej. la banda diagonal aparece con una animación breve), skeleton/loading states mientras se cargan los datos.
- **Altamente responsive**: mobile-first, el grid de cards se adapta de 1 columna en mobile a varias en desktop; el modal de confirmación debe verse bien en pantallas pequeñas.
- Iconografía: usar una librería de íconos consistente con lo que ya use `dcuero-app` (revisar cuál usan — Lucide, Heroicons, etc. — y reutilizarla) para el ícono de "Ir al sitio" y otros.

---

## 9. Entregables esperados de esta fase de SDD

Antes de tocar código, produce:

1. **Spec técnica completa** cubriendo: modelo de datos definitivo en DynamoDB (con justificación del diseño elegido), contratos de los endpoints de API (rutas, métodos, payloads, respuestas, códigos de error), rutas del frontend, lista de componentes principales, y criterios de aceptación por feature (listado, detalle, reserva, admin, contador, reset).
2. **Plan de implementación** en fases (ej.: Fase 0 - bootstrap IaC; Fase 1 - tabla DynamoDB + parámetros SSM + API routes; Fase 2 - `/shared` listado; Fase 3 - `/shared/:wishId` + reservas; Fase 4 - `/me`; Fase 5 - CI/CD del repo (terraform apply + deploy a Vercel); Fase 6 - polish de estilo/animaciones), cada fase con criterios de "done" verificables.
3. Solo después de que yo valide la spec y el plan, comenzar la implementación fase por fase.