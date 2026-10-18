# Contratos C21

Aplicación web para registrar, administrar y consultar contratos inmobiliarios de una oficina Century 21.

**Tecnologías:** Next.js 15.5.28 (App Router y Server Actions), TypeScript, Tailwind CSS y Redis local.

## Requisitos locales

- Node.js 24 LTS y npm.
- Docker Desktop con Docker Compose habilitado.
- Visual Studio Code (recomendado).

El proyecto usa Node.js 24 para el desarrollo. La versión 20 que indicaba la base ya está fuera de soporte; Node.js 24 es una versión LTS vigente. ([Calendario oficial de versiones de Node.js](https://nodejs.org/en/about/previous-releases))

## Preparar el entorno en VS Code (Windows / PowerShell)

1. Abre la carpeta `c21-contratos` en VS Code.
2. Abre una terminal PowerShell en la raíz del proyecto.
3. Instala las dependencias y prepara las variables locales:

   ```powershell
   npm ci
   Copy-Item .env.example .env.local
   ```

4. Edita `.env.local`. Genera un secreto de sesión con:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   Copia el resultado en `AUTH_SECRET` y reemplaza `ADMIN_PASSWORD` por una contraseña local de al menos 12 caracteres.
5. Inicia Redis local y crea el administrador inicial:

   ```powershell
   npm run db:up
   npm run seed
   ```

6. Inicia la aplicación:

   ```powershell
   npm run dev
   ```

Abre [http://localhost:3000](http://localhost:3000) e ingresa con `ADMIN_USER` y `ADMIN_PASSWORD` de `.env.local`.

> La aplicación y Redis se ejecutan en tu equipo. No hace falta una cuenta de Upstash ni credenciales de Vercel para probar este entorno.

## Comandos habituales

| Comando | Uso |
|---|---|
| `npm run dev` | Inicia Next.js en modo desarrollo |
| `npm run lint` | Revisa estilo y errores de ESLint |
| `npm run typecheck` | Ejecuta la comprobación de TypeScript |
| `npm run build` | Genera la compilación local de producción |
| `npm run db:up` | Inicia Redis con Docker Compose |
| `npm run db:logs` | Muestra los logs de Redis |
| `npm run db:down` | Detiene Redis y conserva sus datos locales |
| `npm run seed` | Crea o actualiza el administrador local |

Los datos de Redis se guardan en el volumen Docker `c21-contratos-redis-data`. Para reiniciar por completo la base local, ejecuta `docker compose down -v`; esto borra los datos y usuarios locales.

## Validación local antes de guardar cambios

```powershell
npm run lint
npm run typecheck
npm run build
```

No hay workflows de GitHub Actions ni despliegues de Vercel configurados en esta etapa. La integración remota se preparará cuando el piloto local esté validado.

## Versionado y repositorio público (fase posterior)

Cuando el piloto local esté listo, inicializa el historial desde la raíz del proyecto:

```powershell
git init -b main
git add -A
git commit -m "chore: preparar entorno local"
```

Después se creará el repositorio público `c21-contratos` en GitHub y se configurará como `origin`. La creación del remoto y cualquier automatización quedan pendientes para esa fase. Antes de publicar, confirma que solo haya datos ficticios y que `.env.local` no esté incluido en el commit.

## Roles

| Rol | Permisos |
|---|---|
| `asesor` | Crear y editar sus propios contratos |
| `administrativo` | Ver contratos, consultar el dashboard y exportar CSV |
| `admin` | Permisos anteriores, crear o desactivar usuarios y cambiar contraseñas |

## Estructura principal

```text
src/lib/contract-types.ts       Tipos y campos de contrato
src/lib/contracts.ts            Acceso a contratos, historial y estadísticas
src/lib/users.ts                Usuarios y contraseñas
src/lib/session.ts / auth.ts    Sesiones y autorización por rol
src/middleware.ts               Protección de rutas
src/app/actions.ts              Server Actions
src/app/(app)/                  Dashboard, contratos y usuarios
src/app/api/export/             Exportación CSV
scripts/seed-admin.mjs          Inicialización del administrador local
```

## Modelo de datos

| Clave | Tipo | Contenido |
|---|---|---|
| `user:{username}` | JSON | Usuario, rol y hash de contraseña |
| `users:all` | Set | Nombres de usuario |
| `contract:{id}` | JSON | Contrato, campos adicionales e historial |
| `contracts:all` | Sorted set | Contratos ordenados por fecha de creación |
| `contracts:by:{username}` | Sorted set | Contratos de cada asesor |

## Próximas mejoras

- Adjuntar archivos PDF de contratos.
- Exportar a Excel y filtrar por rangos de fechas.
- Generar plantillas de contratos en PDF o Word.
- Añadir límites a los intentos de inicio de sesión.
- Incorporar gráficos mensuales de cierres y comisiones.
- Añadir notificaciones por Telegram.
- Incorporar pruebas automatizadas antes de habilitar CI.
- Añadir paginación para volúmenes mayores de contratos.

## Seguridad en desarrollo

`.env.local` contiene secretos y está excluido de Git. No guardes datos reales de clientes en el entorno de pruebas; utiliza información ficticia hasta definir y aprobar el entorno del piloto.
