# Despliegue gratis: Supabase + Vercel

La app usa Supabase solo como base de datos (Postgres). Vercel sirve la web.
Las claves que se usan son públicas (`NEXT_PUBLIC_*`); la seguridad vive en RLS.

## 1. Crear proyecto en Supabase

1. Entrar en https://supabase.com y acceder con GitHub.
2. **New project** → nombre `agenda-abu`, contraseña de base de datos fuerte (guardarla), región más cercana, plan **Free**.
3. Esperar 1–2 minutos a que termine el aprovisionamiento.

## 2. Crear las tablas

1. En el proyecto: **SQL Editor** → **New query**.
2. Pegar el contenido de `supabase/schema.sql` y pulsar **Run** (ejecutar una sola vez).
3. Comprobar en **Table Editor** que aparecen `people`, `shifts`, `assignments`, `activity_log` y `app_settings`, con 3 turnos de ejemplo.

## 3. Copiar credenciales

En **Project Settings → API** (o **Data API**):

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **Publishable key** (antes `anon public`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## 4. Probar en local

```bash
copy .env.example .env.local
# editar .env.local con los dos valores anteriores
npm.cmd install
npm.cmd run dev
```

Abrir http://localhost:3000. Debe verse el carrusel de días con los 3 turnos.
Si no carga, revisar `/api/health`: comprueba las 3 tablas contra Supabase.

## 5. Subir a GitHub

```bash
git init
git add .
git commit -m "Base del proyecto: Next.js + Supabase"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/agenda-abu.git
git push -u origin main
```

`.env.local` está en `.gitignore`; no se sube.

## 6. Desplegar en Vercel

1. https://vercel.com → acceder con GitHub.
2. **Add New → Project** → importar el repo `agenda-abu`.
3. Framework preset: **Next.js** (detectado solo). Root directory: `./`. No cambiar build ni output.
4. **Environment Variables**: añadir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (marcar Production, Preview y Development).
5. **Deploy** y esperar. La URL `*.vercel.app` queda lista.

Importante: las variables `NEXT_PUBLIC_*` se incrustan en el build. Si se cambian,
hay que hacer **Redeploy** (Deployments → ⋯ → Redeploy).

### Alternativa con CLI (opcional)

```bash
npm.cmd install -g vercel
vercel login
vercel          # preview
vercel --prod   # producción
```

## 7. Después de cada cambio

`git push` a `main` → Vercel despliega solo. Si se toca `supabase/schema.sql`,
ejecutarlo a mano en el SQL Editor (no hay migraciones automáticas todavía).

## Límites del plan free

- Supabase: 500 MB de base de datos, 2 proyectos activos. **El proyecto se pausa tras ~7 días sin actividad**; se restaura desde el dashboard (tarda un poco). Con uso familiar habitual no suele pasar.
- Vercel: 100 GB de ancho de banda/mes, suficiente de sobra.

## Seguridad mínima

- La `publishable key` es pública por diseño; no pasa nada si se ve. RLS controla el acceso.
- No usar la `service_role` key en este frontend ni en variables `NEXT_PUBLIC_*`.
- Cualquiera con la URL puede ver y añadir personas. Si eso no vale, el siguiente paso es un PIN o Supabase Auth.
