"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Person = { id: string; name: string };
type Shift = { id: string; label: string; start_time: string; end_time: string };
type Day = { key: string; date: Date };
type AssignmentMap = Record<string, string>;

const INITIAL_DAYS = 30;
const PAST_DAYS = 30;

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const hhmm = (time: string) => time.slice(0, 5);
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const weekdayFmt = new Intl.DateTimeFormat("es", { weekday: "long" });
const dateFmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
const longDateFmt = new Intl.DateTimeFormat("es", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function buildDays(futureDays: number): Day[] {
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  return Array.from({ length: PAST_DAYS + 1 + futureDays }, (_, i) => {
    const date = new Date(base);
    date.setDate(base.getDate() - PAST_DAYS + i);
    return { key: iso(date), date };
  });
}

function friendly(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string };
    if (e.code === "23505") return "Ese nombre ya existe.";
    if (e.message) return e.message;
  }
  return String(error);
}

async function fetchAll() {
  const db = supabase();
  const [people, shifts, assignments] = await Promise.all([
    db.from("people").select("id,name").order("name"),
    db.from("shifts").select("id,label,start_time,end_time").order("start_time"),
    db.from("assignments").select("shift_id,date,person_id"),
  ]);

  const error = people.error ?? shifts.error ?? assignments.error;
  if (error) throw error;

  const map: AssignmentMap = {};
  for (const row of assignments.data ?? []) {
    map[`${row.date}|${row.shift_id}`] = row.person_id;
  }

  return {
    people: (people.data ?? []) as Person[],
    shifts: (shifts.data ?? []) as Shift[],
    assignments: map,
  };
}

function dayStatus(dayKey: string, shifts: Shift[], assignments: AssignmentMap) {
  if (!shifts.length) return { tone: "empty", label: "Sin turnos" };
  const covered = shifts.filter((shift) => assignments[`${dayKey}|${shift.id}`]).length;
  if (covered === shifts.length) return { tone: "full", label: "Cubierto" };
  if (covered > 0) return { tone: "partial", label: "Parcialmente" };
  return { tone: "empty", label: "Sin cubrir" };
}

export default function Agenda() {
  const [dayCount, setDayCount] = useState(INITIAL_DAYS);
  const days = useMemo(() => buildDays(dayCount), [dayCount]);
  const [people, setPeople] = useState<Person[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<AssignmentMap>({});
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [personName, setPersonName] = useState("");
  const [shiftLabel, setShiftLabel] = useState("");
  const [shiftStart, setShiftStart] = useState("10:00");
  const [shiftEnd, setShiftEnd] = useState("18:00");

  const dialogRef = useRef<HTMLDialogElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const data = await fetchAll();
    setPeople(data.people);
    setShifts(data.shifts);
    setAssignments(data.assignments);
  }, []);

  const retry = useCallback(() => {
    setLoading(true);
    setLoadFailed(false);
    setError(null);
    refresh()
      .catch((e) => {
        setError(friendly(e));
        setLoadFailed(true);
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    retry();
  }, [retry]);

  useEffect(() => {
    if (loading || loadFailed) return;
    const track = trackRef.current;
    if (!track) return;
    const today = iso(new Date());
    const card = [...track.querySelectorAll<HTMLElement>(".day-card")].find(
      (element) => element.dataset.day === today
    );
    if (!card) return;
    const frame = requestAnimationFrame(() => {
      const delta = card.getBoundingClientRect().left - track.getBoundingClientRect().left;
      track.scrollLeft += delta - (track.clientWidth - card.offsetWidth) / 2;
    });
    return () => cancelAnimationFrame(frame);
  }, [loading, loadFailed]);

  async function mutate(
    action: () => PromiseLike<{ error: { message: string; code?: string } | null }>,
    onSuccess?: () => void
  ) {
    setBusy(true);
    setError(null);
    try {
      const { error: actionError } = await action();
      if (actionError) throw actionError;
      onSuccess?.();
      await refresh();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function addPerson(event: FormEvent) {
    event.preventDefault();
    const name = personName.trim();
    if (!name) return;
    await mutate(
      () => supabase().from("people").insert({ name }),
      () => setPersonName("")
    );
  }

  async function removePerson(person: Person) {
    if (!window.confirm(`¿Quitar a ${person.name}? También se borrarán sus turnos asignados.`)) {
      return;
    }
    await mutate(() => supabase().from("people").delete().eq("id", person.id));
  }

  async function addShift(event: FormEvent) {
    event.preventDefault();
    if (!shiftLabel.trim()) {
      setError("Ponle un nombre al turno.");
      return;
    }
    await mutate(
      () =>
        supabase().from("shifts").insert({
          label: shiftLabel.trim(),
          start_time: shiftStart,
          end_time: shiftEnd,
        }),
      () => setShiftLabel("")
    );
  }

  async function removeShift(shift: Shift) {
    if (!window.confirm(`¿Eliminar el turno ${shift.label}? Se borrarán sus asignaciones.`)) {
      return;
    }
    await mutate(() => supabase().from("shifts").delete().eq("id", shift.id));
  }

  async function assign(dayKey: string, shiftId: string, personId: string) {
    const key = `${dayKey}|${shiftId}`;
    setAssignments((prev) => {
      const next = { ...prev };
      if (personId) next[key] = personId;
      else delete next[key];
      return next;
    });
    setError(null);

    const db = supabase();
    const { error: assignError } = personId
      ? await db
          .from("assignments")
          .upsert(
            { shift_id: shiftId, date: dayKey, person_id: personId },
            { onConflict: "shift_id,date" }
          )
      : await db
          .from("assignments")
          .delete()
          .eq("shift_id", shiftId)
          .eq("date", dayKey);

    if (assignError) {
      setError(friendly(assignError));
      refresh().catch(() => {});
    }
  }

  function addDay() {
    setDayCount((count) => count + 1);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const track = trackRef.current;
        track?.scrollTo({ left: track.scrollWidth, behavior: "smooth" });
      });
    });
  }

  function scrollDays(direction: number) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(".day-card");
    const amount = (card?.offsetWidth ?? 320) + 16;
    const cards = window.innerWidth > 900 ? 2 : 1;
    track.scrollBy({ left: direction * amount * cards, behavior: "smooth" });
  }

  if (loading) {
    return (
      <main className="agenda center">
        <p className="loading">Cargando agenda…</p>
      </main>
    );
  }

  if (loadFailed) {
    return (
      <main className="agenda center">
        <p className="alert" role="alert">
          No se pudo cargar la agenda: {error}
        </p>
        <button className="primary" onClick={retry}>
          Reintentar
        </button>
      </main>
    );
  }

  const firstDay = days[0];
  const lastDay = days[days.length - 1];
  const todayKey = iso(new Date());
  const todayLabel = cap(longDateFmt.format(new Date()));

  return (
    <main className="agenda">
      <header className="topbar">
        <div>
          <div className="title-row">
            <h1>Agenda Abu</h1>
            <span className="today-label">Fecha Actual: {todayLabel}</span>
          </div>
          <p>
            {dateFmt.format(firstDay.date)} – {dateFmt.format(lastDay.date)}
          </p>
        </div>
        <nav className="nav" aria-label="Días">
          <button onClick={() => scrollDays(-1)} aria-label="Días anteriores">
            ‹
          </button>
          <button onClick={() => scrollDays(1)} aria-label="Días siguientes">
            ›
          </button>
        </nav>
      </header>

      {error && (
        <p className="alert inline" role="alert">
          {error}
        </p>
      )}

      <div className="carousel" ref={trackRef}>
        {days.map((day) => {
          const status = dayStatus(day.key, shifts, assignments);
          const isToday = day.key === todayKey;
          const isPast = day.key < todayKey;
          return (
            <article
              key={day.key}
              data-day={day.key}
              className={`day-card${isToday ? " today" : ""}${isPast ? " past" : ""}`}
            >
              <header className="day-head">
                <div>
                  <p className="day-weekday">
                    {cap(weekdayFmt.format(day.date))}
                    {isToday && <span className="today-tag">Hoy</span>}
                    {isPast && <span className="past-tag">Día anterior</span>}
                  </p>
                  <p className="day-date">{dateFmt.format(day.date)}</p>
                </div>
                <span className={`badge ${status.tone}`}>{status.label}</span>
              </header>

              <div className="shifts">
                {shifts.map((shift) => (
                  <label className="shift" key={shift.id}>
                    <span className="shift-info">
                      <span className="shift-label">{shift.label}</span>
                      <span className="shift-time">
                        {hhmm(shift.start_time)} – {hhmm(shift.end_time)}
                      </span>
                    </span>
                    <select
                      aria-label={`${shift.label} del ${dateFmt.format(day.date)}`}
                      value={assignments[`${day.key}|${shift.id}`] ?? ""}
                      onChange={(event) => assign(day.key, shift.id, event.target.value)}
                      disabled={!people.length || busy}
                    >
                      <option value="">
                        {people.length ? "Sin asignar" : "Sin personas"}
                      </option>
                      {people.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}

                {!shifts.length && (
                  <p className="empty">
                    Sin turnos. Añádelos desde el botón de configuración.
                  </p>
                )}
              </div>
            </article>
          );
        })}

        <button className="add-day" onClick={addDay} aria-label="Añadir el siguiente día">
          <span aria-hidden="true">+</span>
          <span>Añadir día</span>
        </button>
      </div>

      <button
        className="fab"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="Configurar personas y horarios"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
          <circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" />
          <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
          <circle cx="8" cy="17" r="2" fill="currentColor" stroke="none" />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        className="config"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="config-body">
          <header className="config-head">
            <h2>Configuración</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Cerrar configuración"
            >
              ×
            </button>
          </header>

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          <section>
            <h3>Lista de personas</h3>
            <form className="row-form" onSubmit={addPerson}>
              <input
                value={personName}
                onChange={(event) => setPersonName(event.target.value)}
                placeholder="Nombre"
                name="person-name"
                maxLength={60}
                aria-label="Nombre de la persona"
              />
              <button type="submit" disabled={busy || !personName.trim()}>
                Añadir
              </button>
            </form>
            <ul className="config-list">
              {people.map((person) => (
                <li key={person.id}>
                  <span>{person.name}</span>
                  <button
                    type="button"
                    onClick={() => removePerson(person)}
                    disabled={busy}
                    aria-label={`Quitar a ${person.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
              {!people.length && <li className="muted">Aún no hay personas.</li>}
            </ul>
          </section>

          <section>
            <h3>Horarios</h3>
            <form className="shift-form" onSubmit={addShift}>
              <input
                value={shiftLabel}
                onChange={(event) => setShiftLabel(event.target.value)}
                placeholder="Nombre del turno (ej. Día)"
                name="shift-label"
                maxLength={40}
                aria-label="Nombre del turno"
              />
              <div className="times">
                <label>
                  Inicio
                  <input
                    type="time"
                    value={shiftStart}
                    onChange={(event) => setShiftStart(event.target.value)}
                    name="shift-start"
                    required
                  />
                </label>
                <label>
                  Fin
                  <input
                    type="time"
                    value={shiftEnd}
                    onChange={(event) => setShiftEnd(event.target.value)}
                    name="shift-end"
                    required
                  />
                </label>
              </div>
              <button type="submit" disabled={busy || !shiftLabel.trim()}>
                Añadir turno
              </button>
            </form>
            <ul className="config-list">
              {shifts.map((shift) => (
                <li key={shift.id}>
                  <span>
                    <strong>{shift.label}</strong>{" "}
                    <span className="muted">
                      {hhmm(shift.start_time)} – {hhmm(shift.end_time)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeShift(shift)}
                    disabled={busy}
                    aria-label={`Eliminar turno ${shift.label}`}
                  >
                    ×
                  </button>
                </li>
              ))}
              {!shifts.length && <li className="muted">Aún no hay turnos.</li>}
            </ul>
          </section>
        </div>
      </dialog>
    </main>
  );
}
