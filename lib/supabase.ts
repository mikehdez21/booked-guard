import { createClient } from "@supabase/supabase-js";

/** Cliente de navegador. Solo usa la anon key: la seguridad real vive en las políticas RLS. */
export function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY. Copia .env.example a .env.local"
    );
  }
  return createClient(url, key);
}
