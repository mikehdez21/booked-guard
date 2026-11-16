# AGENTS.md — Agenda Abu

Agenda familiar por días y horarios. Cada persona se identifica con un `select` de nombre; habrá una sección "Lista de personas". App privada de uso familiar, sin login por ahora.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript.
- CSS plano en `app/globals.css`. No Tailwind ni librerías de UI.
- Supabase (Postgres) para persistencia y su JS SDK (`@supabase/supabase-js`).
- Deploy: Vercel (plan free) + Supabase (plan free).

## Comandos

```bash
npm.cmd install      # Windows: npm.ps1 está bloqueado por ExecutionPolicy
npm.cmd run dev      # http://localhost:3000
npm.cmd run build
npm.cmd run typecheck
```

## Estructura

```
app/layout.tsx        layout raíz, metadata, lang="es"
app/page.tsx          vista inicial ("Hola Mundo")
app/api/health/route.ts  comprueba conexión real con Supabase
app/globals.css       estilos globales
lib/supabase.ts       cliente de navegador, lazy (no falla en build sin env)
supabase/schema.sql   SQL para pegar en el SQL Editor de Supabase
.env.example          plantilla de variables
deploy.md             pasos de despliegue
```

## Variables de entorno

Solo públicas (se incrustan en el bundle, es normal):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Local: copiar `.env.example` a `.env.local`. En Vercel: Project Settings > Environment Variables.
Nunca poner `service_role` en una variable `NEXT_PUBLIC_*`.

## Datos

Tabla `people` (id, name único, created_at) definida en `supabase/schema.sql`.
Pendiente: tablas de días/horarios y reservas cuando toque esa pantalla.

## Seguridad

RLS activado en `people`: lectura e inserción públicas (enlace familiar sin login).
shortcut: cualquiera con la URL puede añadir o ver nombres; si molesta, añadir PIN o auth de Supabase más adelante.

## Convenciones

- Cambios pequeños y por pasos: primero la vista, luego los datos.
- Textos de UI en español.
- No añadir dependencias sin necesidad real.
- No crear endpoints API mientras la vista pueda leer Supabase directamente. Excepción: `/api/health`.
- Validar entradas en el punto de escritura (formularios) y con constraints en la DB.

## Siguiente

1. Sección "Lista de personas" (alta + `select`).
2. Vista de agenda por días y horarios.
3. Reservas asociadas a persona + día + hora.
