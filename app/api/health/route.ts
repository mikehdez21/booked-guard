import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { count, error } = await supabase()
      .from("people")
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    return NextResponse.json({ ok: true, people: count ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
