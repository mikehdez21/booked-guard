import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const db = supabase();
    const [people, shifts, assignments] = await Promise.all([
      db.from("people").select("id", { count: "exact" }).limit(1),
      db.from("shifts").select("id", { count: "exact" }).limit(1),
      db.from("assignments").select("id", { count: "exact" }).limit(1),
    ]);
    const error = people.error ?? shifts.error ?? assignments.error;
    if (error) throw error;
    return NextResponse.json({
      ok: true,
      people: people.count ?? 0,
      shifts: shifts.count ?? 0,
      assignments: assignments.count ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
