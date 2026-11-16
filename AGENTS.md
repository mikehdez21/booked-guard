# AGENTS.md — Agenda Abu

Agenda familiar por días y turnos. Una sola pantalla con carrusel de 30 días pasados + 30 futuros (extensible con "+"), un card por día y tres turnos diarios. El día actual queda centrado y los pasados se atenúan con la etiqueta "Día anterior". Cualquiera con el enlace puede asignar su nombre o el de otra persona a un turno. Sin login, roles ni OAuth: coordinación familiar por mensaje.

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
app/layout.tsx           layout raíz, metadata, lang="es"
app/page.tsx             renderiza <Agenda />
app/agenda.tsx           cliente: carrusel, selects, panel de configuración y registros
app/api/health/route.ts  comprueba conexión real con las 3 tablas
app/globals.css          estilos globales
lib/supabase.ts          cliente único lazy (no falla en build sin env)
supabase/schema.sql      SQL para pegar en el SQL Editor de Supabase
.env.example             plantilla de variables
deploy.md                pasos de despliegue
```

## Variables de entorno

Solo públicas (se incrustan en el bundle, es normal):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Local: copiar `.env.example` a `.env.local`. En Vercel: Project Settings > Environment Variables.
Nunca poner `service_role` o `secret` en una variable `NEXT_PUBLIC_*`.

## Datos

- `people`: id, name (único sin distinguir mayúsculas), created_at.
- `shifts`: turnos diarios configurables (label, start_time, end_time). Seed: Día 10:00–18:00, Tarde 18:30–23:00, Noche 23:00–09:30.
- `assignments`: una persona por turno y fecha (`unique(shift_id, date)`); al borrar persona o turno se borran sus asignaciones.
- `activity_log`: registro de solo lectura escrito por triggers (cambios de asignación, altas de personas y turnos).
- `app_settings`: ajustes compartidos; `future_days` guarda cuántos días futuros muestra el carrusel (el "+" lo incrementa y persiste).

El turno Noche cruza medianoche: cuenta en la fecha en que inicia.
Estado por día: Cubierto (todos los turnos con persona), Parcialmente cubierto (alguno), Sin cubrir (ninguno).
El carrusel arranca con 30 días pasados + hoy + 30 futuros, centra hoy al cargar y el "+" al final añade el siguiente día. Los pasados se ven atenuados (opacity .62) y siguen siendo consultables/editables.

Tiempo real: las 5 tablas están en la publicación `supabase_realtime` (`activity_log` solo inserts) con `replica identity full`; el cliente se suscribe a `postgres_changes` y refresca los datos con debounce de 150 ms.

## Seguridad

RLS activado en las 3 tablas con lectura y escritura públicas (rol `anon`), sin auth.
shortcut: cualquiera con la URL puede ver, asignar y borrar; si molesta, añadir PIN o Supabase Auth más adelante.

## Convenciones

- Cambios pequeños y por pasos.
- Textos de UI en español.
- No añadir dependencias sin necesidad real.
- No crear endpoints API mientras la vista pueda leer Supabase directamente. Excepción: `/api/health`.
- Validar entradas en el punto de escritura (formularios) y con constraints en la DB.
- Fechas en horario local del navegador; no usar la zona del servidor.

## Siguiente

Sin pasos pendientes definidos. Ideas si se piden: editar turnos existentes sin borrarlos, PIN de acceso, notificaciones.
