# Agenda familiar

Aplicación web de una sola pantalla para coordinar turnos familiares por día. Un carrusel muestra los días con tres turnos fijos (Día, Tarde y Noche); en cada turno se elige la persona y se ajustan las horas de ese día. Los cambios se sincronizan en tiempo real entre dispositivos.

## Funcionalidades

- Carrusel de 30 días pasados y 30 futuros; el día actual queda centrado y los días pasados se muestran atenuados.
- Botón "+" al final para añadir el siguiente día (queda guardado en la base de datos).
- Tres turnos fijos por día: Día, Tarde y Noche. No se pueden crear ni eliminar turnos.
- Horarios editables por día y turno con campos de inicio y fin.
- Un select de persona por turno; solo puede haber una persona asignada.
- Estado por día: Cubierto, Parcialmente cubierto o Sin cubrir.
- Panel de configuración con la lista de personas.
- Registro de cambios: asignaciones (incluye cambios de una persona a otra), altas de personas y altas de turnos.
- Diseño responsive: menú de engrane en móvil y botones flotantes en escritorio.
- Sin login ni roles: pensada para compartir por un enlace privado de confianza.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript.
- CSS plano, sin frameworks de UI.
- Supabase (Postgres + Realtime) como base de datos.
- Vercel para el despliegue.

## Puesta en marcha

Requisitos: Node.js 22 o superior, npm y un proyecto de Supabase.

1. Instalar dependencias:

```bash
npm install
```

2. Crear las tablas ejecutando `supabase/schema.sql` en el SQL Editor de Supabase.

3. Copiar `.env.example` a `.env.local` y completar:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

4. Arrancar en local:

```bash
npm run dev
```

En Windows, si `npm` está bloqueado por la política de ejecución de PowerShell, usar `npm.cmd`.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servir el build |
| `npm run typecheck` | Comprobar tipos |

## Despliegue

Los pasos detallados para Supabase y Vercel están en [`deploy.md`](deploy.md).

## Estructura

```
app/            páginas, componente de agenda y estilos
lib/            cliente de Supabase
supabase/       esquema SQL
deploy.md       guía de despliegue
```

## Seguridad

La aplicación no tiene autenticación. La lectura y escritura están abiertas mediante RLS para que el enlace familiar funcione sin cuentas: cualquier persona con la URL puede ver y modificar los turnos. No compartir el enlace fuera del grupo de confianza.
