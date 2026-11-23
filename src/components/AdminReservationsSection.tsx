import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { AdminReservation } from "./adminTypes";
import "./admin-reservas.css";

type ReservationStatus = "pendiente" | "confirmada" | "completada" | "cancelada";
type ReservationUI = {
  id: number;
  userId: number | null;
  usuario: string;
  email: string;
  espacio: string;
  ubicacion: string;
  inicio: Date | null;
  fin: Date | null;
  huespedes: number;
  estado: ReservationStatus;
  activo: boolean;
  canEditGuests: boolean;
};
type ReservationPayload = Partial<Pick<ReservationUI, "estado" | "huespedes">> & { active?: boolean; cancellationReason?: string };
type StatusOption = { t: string; c: string };
type SortColumn = "usuario" | "espacio" | "inicio" | "huespedes" | "estado";
type SortState = { col: SortColumn; dir: 1 | -1 };

interface AdminReservationsSectionProps {
  reservations: AdminReservation[];
  updateReservation: (id: number, payload: ReservationPayload) => Promise<boolean>;
  deleteReservations: (ids: number[]) => Promise<void>;
}

const ESTADOS: Record<ReservationStatus, StatusOption> = {
  pendiente: { t: "Pendiente", c: "#f0a951" },
  confirmada: { t: "Confirmada", c: "#3b73ff" },
  completada: { t: "Completada", c: "#3ccf82" },
  cancelada: { t: "Cancelada", c: "#ff7a8a" },
};
const GRADS = [["#3b73ff", "#7c6cff"], ["#7c6cff", "#e0457b"], ["#2fa37a", "#3b73ff"], ["#f0803c", "#e0457b"], ["#f0a951", "#e0457b"], ["#e0457b", "#7c6cff"]];
type IconName = "search" | "x" | "eye" | "trash" | "up" | "down" | "left" | "right" | "check" | "plus" | "minus" | "warn" | "pin" | "users";

const hash = (s: string) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const grad = (s: string) => GRADS[hash(s) % GRADS.length];

/* ---------- Utilidades ---------- */
const norm = (s: string) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const fDia = new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short" });
const fLargo = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fHora = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", hour12: true });
const duracion = (a: Date | null, b: Date | null) => {
  if (!a || !b) return "—"
  const m = Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000))
  const h = Math.floor(m / 60), r = m % 60
  return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`
}
const dia0 = (d: Date | null) => {
  if (!d) return 0
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}
const iniciales = (n: string) => n.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
const reservationDateTime = (date: unknown, time: unknown): Date | null => {
  if (typeof date !== "string" || !date) return null
  const datePart = date.slice(0, 10)
  const timePart = typeof time === "string" && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : date.match(/T(\d{2}:\d{2})/)?.[1] ?? "00:00"
  const value = /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? `${datePart}T${timePart}` : date
  const result = new Date(value)
  return Number.isNaN(result.getTime()) ? null : result
}
const toReservationUI = (reservation: AdminReservation): ReservationUI => ({
  id: reservation.id,
  userId: typeof reservation.user_id === "number" ? reservation.user_id : null,
  usuario: String(reservation.username ?? `Usuario #${reservation.user_id ?? ""}`),
  email: String(reservation.email ?? ""),
  espacio: String(reservation.hotel ?? "Espacio"),
  ubicacion: String(reservation.ubicacion ?? ""),
  inicio: reservationDateTime(reservation.check_in, reservation.check_in_time),
  fin: reservationDateTime(reservation.check_out, reservation.check_out_time),
  huespedes: typeof reservation.huespedes === "number" ? reservation.huespedes : 1,
  estado: reservation.estado === "confirmada" || reservation.estado === "completada" || reservation.estado === "cancelada" ? reservation.estado : "pendiente",
  activo: reservation.active !== false,
  canEditGuests: !reservation.check_in_time,
})
const toReservationPayload = (reservation: ReservationUI): ReservationPayload => ({
  estado: reservation.estado,
  active: reservation.estado === "completada" ? true : reservation.activo,
  huespedes: reservation.huespedes,
})

function useContar(valor: number, ms = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf: number | undefined;
    let t0: number | null = null;
    const paso: FrameRequestCallback = (t) => { if (t0 === null) t0 = t; const p = Math.min((t - t0) / ms, 1); setN(Math.round(valor * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(paso); };
    raf = requestAnimationFrame(paso);
    return () => { if (raf !== undefined) cancelAnimationFrame(raf); };
  }, [valor, ms]);
  return n;
}

/* ---------- Íconos ---------- */
const P = {
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>, x: <path d="M18 6 6 18M6 6l12 12" />,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  trash: <><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></>,
  up: <path d="m6 15 6-6 6 6" />, down: <path d="m6 9 6 6 6-6" />, left: <path d="m15 18-6-6 6-6" />, right: <path d="m9 18 6-6-6-6" />,
  check: <path d="M20 6 9 17l-5-5" />, plus: <path d="M12 5v14M5 12h14" />, minus: <path d="M5 12h14" />,
  warn: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></>,
};
const Icon = ({ n, s = 18 }: { n: IconName; s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[n]}</svg>;

/* ---------- Piezas ---------- */
function Kpi({ titulo, valor, color, n, extra }: { titulo: string; valor: number; color: string; n: number; extra?: ReactNode }) {
  const v = useContar(valor);
  return <div className="rs-kpi" style={{ "--c": color, "--n": n } as CSSProperties}><span>{titulo}</span><strong>{v}</strong>{extra}</div>;
}
const Switch = ({ activo, onChange, etiqueta, disabled = false }: { activo: boolean; onChange: (value: boolean) => void; etiqueta: string; disabled?: boolean }) => (
  <button type="button" role="switch" aria-checked={activo} aria-label={etiqueta} disabled={disabled} className={`rs-switch ${activo ? "is-on" : ""}`} onClick={() => onChange(!activo)}><i /></button>
);

// Etiqueta de estado que abre un menú para cambiarlo (posición fija para no cortarse dentro de la tabla)
function Elegir({ valor, opciones, onElegir, etiqueta }: { valor: ReservationStatus; opciones: Record<ReservationStatus, StatusOption>; onElegir: (status: ReservationStatus) => void; etiqueta: string }) {
  const [pos, setPos] = useState<{ left: number; top: number; surface: string; line: string; text: string; ease: string; amber: string } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const o = opciones[valor];
  useEffect(() => {
    if (!pos) return;
    const cerrar = () => setPos(null);
    const fuera = (e: MouseEvent) => { if (!(e.target instanceof Element) || (!btn.current?.contains(e.target) && !e.target.closest(".rs-pop"))) cerrar(); };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    document.addEventListener("mousedown", fuera); document.addEventListener("keydown", tecla);
    window.addEventListener("scroll", cerrar, true); window.addEventListener("resize", cerrar);
    return () => { document.removeEventListener("mousedown", fuera); document.removeEventListener("keydown", tecla); window.removeEventListener("scroll", cerrar, true); window.removeEventListener("resize", cerrar); };
  }, [pos]);
  const abrir = () => {
    if (pos) return setPos(null);
    if (!btn.current) return;
    const r = btn.current.getBoundingClientRect(), alto = Object.keys(opciones).length * 42 + 14;
    const theme = window.getComputedStyle(btn.current.closest(".rs") ?? btn.current);
    setPos({
      left: r.left,
      top: r.bottom + alto > window.innerHeight ? r.top - alto - 6 : r.bottom + 6,
      surface: theme.getPropertyValue("--d-surface").trim(),
      line: theme.getPropertyValue("--d-line").trim(),
      text: theme.getPropertyValue("--d-text").trim(),
      ease: theme.getPropertyValue("--d-ease").trim(),
      amber: theme.getPropertyValue("--d-amber").trim(),
    });
  };
  return (
    <>
      <button ref={btn} type="button" className="rs-badge" style={{ "--c": o.c } as CSSProperties} aria-haspopup="listbox" aria-expanded={!!pos} aria-label={`${etiqueta}: ${o.t}. Cambiar`} onClick={abrir}>
        <i />{o.t}<Icon n="down" s={14} />
      </button>
      {pos && (
        createPortal(
          <ul className="rs-pop" role="listbox" style={{ top: pos.top, left: pos.left, color: pos.text, "--d-surface": pos.surface, "--d-line": pos.line, "--d-text": pos.text, "--d-ease": pos.ease, "--d-amber": pos.amber } as CSSProperties}>
            {(Object.entries(opciones) as [ReservationStatus, StatusOption][]).map(([k, x]) => (
              <li key={k}><button type="button" role="option" aria-selected={k === valor} style={{ "--c": x.c } as CSSProperties} onClick={() => { setPos(null); onElegir(k); }}><i />{x.t}{k === valor && <Icon n="check" s={14} />}</button></li>
            ))}
          </ul>,
          document.body,
        )
      )}
    </>
  );
}

/* ---------- Panel de detalle ---------- */
function Panel({ r, onCerrar, onGuardar }: { r: ReservationUI; onCerrar: () => void; onGuardar: (reservation: ReservationUI) => Promise<boolean> }) {
  const [f, setF] = useState<ReservationUI>(r);
  const [guardando, setGuardando] = useState(false);
  const idx = ["pendiente", "confirmada", "completada"].indexOf(f.estado);
  const cancelada = f.estado === "cancelada";
  const [a, b] = grad(f.usuario);
  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setGuardando(true)
    try {
      await onGuardar(f)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <div className="rs-overlay is-on" onClick={onCerrar} aria-hidden="true" />
      <form className="rs-panel" onSubmit={enviar} aria-label={`Reserva ${r.id}`}>
        <header><div><h2>Reserva #{r.id}</h2><small>{ESTADOS[f.estado].t}</small></div><button type="button" className="rs-icon" onClick={onCerrar} aria-label="Cerrar"><Icon n="x" /></button></header>
        <div className="rs-panel__body">
          <ol className={`rs-linea ${cancelada ? "is-cancel" : ""}`} style={{ "--p": cancelada ? 0 : Math.max(idx, 0) / 2 } as CSSProperties} aria-label="Progreso de la reserva">
            <span className="rs-linea__riel" aria-hidden="true"><i /></span>
            {["Solicitada", "Confirmada", "Completada"].map((t, i) => (
              <li key={t} className={!cancelada && i < idx ? "is-done" : !cancelada && i === idx ? "is-now" : ""}><span>{!cancelada && i < idx ? <Icon n="check" s={14} /> : i + 1}</span>{t}</li>
            ))}
          </ol>
          {cancelada && <p className="rs-aviso"><Icon n="warn" s={16} />Esta reserva fue cancelada.</p>}

          <div className="rs-resumen">
            <div className="rs-cli"><span className="rs-av" style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>{iniciales(f.usuario)}</span><div><b>{f.usuario}</b><small>{f.email}</small></div></div>
            <dl>
              <div><dt>Espacio</dt><dd>{f.espacio}</dd></div>
              <div><dt>Ubicación</dt><dd>{f.ubicacion}</dd></div>
              <div><dt>Check-in</dt><dd>{f.inicio ? `${fLargo.format(f.inicio)} · ${fHora.format(f.inicio)}` : "Fecha pendiente"}</dd></div>
              <div><dt>Check-out</dt><dd>{f.fin ? `${fLargo.format(f.fin)} · ${fHora.format(f.fin)}` : "Fecha pendiente"}</dd></div>
              <div><dt>Duración</dt><dd>{duracion(f.inicio, f.fin)}</dd></div>
            </dl>
          </div>

          <div className="rs-campo"><label>Huéspedes
            <div className="rs-stepper">
              <button type="button" aria-label="Menos huéspedes" disabled={!f.canEditGuests} onClick={() => setF((x) => ({ ...x, huespedes: Math.max(1, x.huespedes - 1) }))}><Icon n="minus" /></button>
              <output><b>{f.huespedes}</b> {f.huespedes === 1 ? "persona" : "personas"}</output>
              <button type="button" aria-label="Más huéspedes" disabled={!f.canEditGuests} onClick={() => setF((x) => ({ ...x, huespedes: x.huespedes + 1 }))}><Icon n="plus" /></button>
            </div>
          </label></div>
          {!f.canEditGuests && <p className="rs-nota">No se puede cambiar la cantidad de huéspedes en una reserva por horas.</p>}
          <div className="rs-campo"><span className="rs-lbl">Estado</span><Elegir valor={f.estado} opciones={ESTADOS} etiqueta="Estado" onElegir={(k) => setF((x) => ({ ...x, estado: k }))} /></div>
          <div className="rs-activo"><div><b>Reserva activa</b><small>Si la desactivas, deja de contar en el calendario del espacio.</small></div><Switch activo={f.activo} onChange={(v) => setF((x) => ({ ...x, activo: v }))} etiqueta="Reserva activa" /></div>
        </div>
        <footer><button type="button" className="rs-btn rs-btn--ghost" onClick={onCerrar}>Cancelar</button><button type="submit" className="rs-btn rs-btn--solid" disabled={guardando}>{guardando ? <><i className="rs-spin" />Guardando</> : "Guardar cambios"}</button></footer>
      </form>
    </>
  );
}

/* ---------- Componente principal ---------- */
type PendingCancellation = { reservation: ReservationUI; closePanel: boolean };
type TimeFilter = "todas" | "proximas" | "pasadas";

export default function AdminReservationsSection({ reservations, updateReservation, deleteReservations }: AdminReservationsSectionProps) {
  const [lista, setLista] = useState(() => reservations.map(toReservationUI));
  const [ahora] = useState(() => new Date());
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<ReservationStatus | "todas">("todas");
  const [tiempo, setTiempo] = useState<TimeFilter>("todas");
  const [orden, setOrden] = useState<SortState>({ col: "inicio", dir: -1 });
  const [pag, setPag] = useState(1);
  const [sel, setSel] = useState<Set<number>>(() => new Set());
  const [ver, setVer] = useState<ReservationUI | null>(null);
  const [borrar, setBorrar] = useState<number[] | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastError, setToastError] = useState(false);
  const [pendingCancellation, setPendingCancellation] = useState<PendingCancellation | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const buscar = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const POR_PAGINA = 8;

  useEffect(() => setLista(reservations.map(toReservationUI)), [reservations]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => setPag(1), [q, estado, tiempo]);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement instanceof HTMLElement && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); buscar.current?.focus(); }
      if (e.key === "Escape") { setVer(null); setBorrar(null); setPendingCancellation(null); }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  const avisar = (m: string, isError = false) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(m);
    setToastError(isError);
    timer.current = setTimeout(() => setToast(null), 3500);
  };

  const cuenta = (k: ReservationStatus) => lista.filter((r) => r.estado === k).length;
  const filtrada = useMemo(() => {
    const t = norm(q.trim());
    const r = lista.filter((x) =>
      (estado === "todas" || x.estado === estado) &&
      (tiempo === "todas" || (tiempo === "proximas") === Boolean(x.fin && x.fin >= ahora)) &&
      (!t || norm(`${x.usuario} ${x.email} ${x.espacio} ${x.ubicacion} #${x.id}`).includes(t)));
    const { col, dir } = orden;
    return [...r].sort((a, b) => {
      const left = a[col];
      const right = b[col];
      const comparison = col === "inicio"
        ? (a.inicio?.getTime() ?? 0) - (b.inicio?.getTime() ?? 0)
        : typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), "es");
      return comparison * dir;
    });
  }, [lista, q, estado, tiempo, orden, ahora]);

  const paginas = Math.max(1, Math.ceil(filtrada.length / POR_PAGINA));
  const pagina = Math.min(pag, paginas);
  const visibles = filtrada.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const hayFiltros = Boolean(q || estado !== "todas" || tiempo !== "todas");
  const limpiar = () => { setQ(""); setEstado("todas"); setTiempo("todas"); };
  const proximas = lista.filter((r) => r.estado === "confirmada" && r.fin && r.fin >= ahora).length;

  const ordenar = (col: SortColumn) => setOrden((o) => (o.col === col ? { col, dir: o.dir === 1 ? -1 : 1 } : { col, dir: col === "inicio" ? -1 : 1 }));
  const marcar = (id: number) => setSel((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const todosPagina = visibles.length > 0 && visibles.every((r) => sel.has(r.id));
  const algunoPagina = visibles.some((r) => sel.has(r.id));
  const marcarPagina = () => setSel((s) => { const n = new Set(s); visibles.forEach((r) => (todosPagina ? n.delete(r.id) : n.add(r.id))); return n; });
  const persistir = async (reservation: ReservationUI, reason?: string, notify = true): Promise<boolean> => {
    const payload = toReservationPayload(reservation);
    if (reason !== undefined) payload.cancellationReason = reason;
    try {
      const saved = await updateReservation(reservation.id, payload);
      if (!saved) {
        if (notify) avisar("No se pudieron guardar los cambios.", true);
        return false;
      }
      const actualizada = { ...reservation, activo: payload.active ?? reservation.activo };
      setLista((current) => current.map((item) => item.id === actualizada.id ? actualizada : item));
      if (notify) avisar("Cambios guardados");
      return true;
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudieron guardar los cambios.", true);
      return false;
    }
  };
  const solicitarGuardar = async (reservation: ReservationUI, closePanel = false): Promise<boolean> => {
    const current = lista.find((item) => item.id === reservation.id);
    if (reservation.estado === "cancelada" && current?.estado !== "cancelada") {
      setPendingCancellation({ reservation, closePanel });
      setCancellationReason("");
      return false;
    }
    const saved = await persistir(reservation);
    if (saved && closePanel) setVer(null);
    return saved;
  };
  const confirmarCancelacion = async () => {
    if (!pendingCancellation || !cancellationReason.trim()) return;
    const saved = await persistir(pendingCancellation.reservation, cancellationReason.trim());
    if (saved) {
      if (pendingCancellation.closePanel) setVer(null);
      setPendingCancellation(null);
      setCancellationReason("");
    }
  };
  const masivo = async (status: ReservationStatus) => {
    const selected = lista.filter((reservation) => sel.has(reservation.id));
    const results = await Promise.all(selected.map((reservation) => persistir({ ...reservation, estado: status }, undefined, false)));
    const count = results.filter(Boolean).length;
    avisar(count === selected.length
      ? `${count} ${count === 1 ? "reserva actualizada" : "reservas actualizadas"} como ${ESTADOS[status].t.toLowerCase()}`
      : `${count} de ${selected.length} reservas se pudieron actualizar.`, count !== selected.length);
    setSel(new Set());
  };
  const eliminar = async () => {
    if (!borrar) return;
    const ids = borrar;
    setBorrando(true);
    try {
      await deleteReservations(ids);
      setLista((current) => current.filter((reservation) => !ids.includes(reservation.id)));
      setSel(new Set());
      setBorrar(null);
      avisar(ids.length === 1 ? "Reserva eliminada" : `${ids.length} reservas eliminadas`);
    } catch (error) {
      setBorrar(null);
      setSel(new Set());
      avisar(error instanceof Error ? error.message : "No se pudieron eliminar las reservas.", true);
    } finally {
      setBorrando(false);
    }
  };

  const Th = ({ col, children }: { col: SortColumn; children: ReactNode }) => (
    <th aria-sort={orden.col === col ? (orden.dir > 0 ? "ascending" : "descending") : "none"}>
      <button type="button" className={`rs-sort ${orden.col === col ? "is-on" : ""}`} onClick={() => ordenar(col)}>{children}<span>{orden.col === col ? <Icon n={orden.dir > 0 ? "up" : "down"} s={14} /> : null}</span></button>
    </th>
  );

  return (
    <section className="rs">
      <div className="rs-kpis">
        <Kpi n={0} color="#7c6cff" titulo="Total de reservas" valor={lista.length} />
        <Kpi n={1} color="#f0a951" titulo="Por confirmar" valor={cuenta("pendiente")} />
        <Kpi n={2} color="#3b73ff" titulo="Próximas confirmadas" valor={proximas} />
        <Kpi n={3} color="#3ccf82" titulo="Completadas" valor={cuenta("completada")} />
      </div>

      <div className="rs-tabla-wrap">
        <div className="rs-barra">
          <label className="rs-buscar">
            <Icon n="search" />
            <input ref={buscar} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente, espacio o ID" aria-label="Buscar reservas" />
            {q ? <button type="button" onClick={() => setQ("")} aria-label="Borrar búsqueda"><Icon n="x" s={15} /></button> : <kbd>/</kbd>}
          </label>
          <div className="rs-seg" role="radiogroup" aria-label="Momento" style={{ "--i": (["todas", "proximas", "pasadas"] as TimeFilter[]).indexOf(tiempo) } as CSSProperties}>
            <span aria-hidden="true" />
            {([["todas", "Todas"], ["proximas", "Próximas"], ["pasadas", "Pasadas"]] as [TimeFilter, string][]).map(([k, t]) => <button key={k} type="button" role="radio" aria-checked={tiempo === k} onClick={() => setTiempo(k)}>{t}</button>)}
          </div>
          {hayFiltros && <button type="button" className="rs-link" onClick={limpiar}>Limpiar filtros</button>}
        </div>
        <div className="rs-fchips" role="radiogroup" aria-label="Estado">
          <button type="button" role="radio" aria-checked={estado === "todas"} className={estado === "todas" ? "is-on" : ""} style={{ "--c": "#7c6cff" } as CSSProperties} onClick={() => setEstado("todas")}>Todos los estados<em>{lista.length}</em></button>
          {(Object.entries(ESTADOS) as [ReservationStatus, StatusOption][]).map(([k, e]) => <button type="button" key={k} role="radio" aria-checked={estado === k} className={estado === k ? "is-on" : ""} style={{ "--c": e.c } as CSSProperties} onClick={() => setEstado(k)}><i />{e.t}<em>{cuenta(k)}</em></button>)}
        </div>

        {visibles.length ? (
          <div className="rs-scroll">
            <table className="rs-tabla">
              <thead>
                <tr>
                  <th className="rs-chk"><input type="checkbox" aria-label="Seleccionar todas" checked={todosPagina} ref={(el) => { if (el) el.indeterminate = algunoPagina && !todosPagina; }} onChange={marcarPagina} /></th>
                  <Th col="usuario">Cliente</Th><Th col="espacio">Espacio</Th><Th col="inicio">Fecha y hora</Th><Th col="huespedes">Huéspedes</Th><Th col="estado">Estado</Th><th>Activa</th><th className="rs-acc-th">Acciones</th>
                </tr>
              </thead>
              <tbody key={`${pagina}${q}${estado}${tiempo}${orden.col}${orden.dir}`}>
                {visibles.map((r, i) => {
                  const [a, b] = grad(r.usuario), [ea, eb] = grad(r.espacio);
                  const d = Math.round((dia0(r.inicio) - dia0(ahora)) / 864e5);
                  const rel = r.inicio && r.estado !== "completada" && r.estado !== "cancelada" && r.fin && r.fin >= ahora ? (d === 0 ? "Hoy" : d === 1 ? "Mañana" : "") : "";
                  return (
                    <tr key={r.id} className={`${!r.activo ? "is-off" : ""} ${sel.has(r.id) ? "is-sel" : ""}`} style={{ "--a": ESTADOS[r.estado].c, "--n": i } as CSSProperties}>
                      <td className="rs-chk"><input type="checkbox" aria-label={`Seleccionar reserva ${r.id}`} checked={sel.has(r.id)} onChange={() => marcar(r.id)} /></td>
                      <td data-label="Cliente"><div className="rs-cli"><span className="rs-av" style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>{iniciales(r.usuario)}</span><div><b>{r.usuario}</b><small>{r.email || "Sin correo"}</small></div></div></td>
                      <td data-label="Espacio"><div className="rs-esp"><span className="rs-tile" style={{ background: `linear-gradient(135deg, ${ea}, ${eb})` }}>{r.espacio[0]?.toUpperCase() ?? "E"}</span><div><b>{r.espacio}</b><small><Icon n="pin" s={12} />{r.ubicacion || "Ubicación no disponible"}</small></div></div></td>
                      <td data-label="Fecha y hora"><div className="rs-fecha"><b>{r.inicio ? fDia.format(r.inicio) : "Fecha pendiente"}{rel && <em>{rel}</em>}</b><small>{r.inicio ? fHora.format(r.inicio) : "—"} – {r.fin ? fHora.format(r.fin) : "—"} <span className="rs-dur">{duracion(r.inicio, r.fin)}</span></small></div></td>
                      <td data-label="Huéspedes"><span className="rs-cap"><Icon n="users" s={16} />{r.huespedes}</span></td>
                      <td data-label="Estado"><Elegir valor={r.estado} opciones={ESTADOS} etiqueta="Estado" onElegir={(status) => { void solicitarGuardar({ ...r, estado: status }); }} /></td>
                      <td data-label="Activa"><Switch activo={r.activo} onChange={(active) => { void solicitarGuardar({ ...r, activo: active }); }} etiqueta={`${r.activo ? "Desactivar" : "Activar"} reserva ${r.id}`} /></td>
                      <td data-label="Acciones" className="rs-acc">
                        <div className="rs-action-group">
                          <button type="button" className="rs-icon" onClick={() => setVer(r)} aria-label={`Ver reserva ${r.id}`} data-tip="Ver detalle"><Icon n="eye" /></button>
                          <button type="button" className="rs-icon rs-icon--bad" onClick={() => setBorrar([r.id])} aria-label={`Eliminar reserva ${r.id}`} data-tip="Eliminar"><Icon n="trash" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rs-vacio"><span><Icon n="search" s={26} /></span><b>No hay reservas con esos filtros</b><p>Prueba con otra búsqueda o cambia el estado.</p><button className="rs-btn rs-btn--ghost" onClick={limpiar}>Limpiar filtros</button></div>
        )}

        <footer className="rs-pie">
          <span>{filtrada.length} {filtrada.length === 1 ? "resultado" : "resultados"}</span>
          {paginas > 1 && (
            <nav className="rs-pager" aria-label="Paginación">
              <button type="button" disabled={pagina === 1} onClick={() => setPag(pagina - 1)} aria-label="Anterior"><Icon n="left" s={16} /></button>
              {Array.from({ length: paginas }, (_, i) => <button type="button" key={i} className={pagina === i + 1 ? "is-on" : ""} aria-current={pagina === i + 1 ? "page" : undefined} onClick={() => setPag(i + 1)}>{i + 1}</button>)}
              <button type="button" disabled={pagina === paginas} onClick={() => setPag(pagina + 1)} aria-label="Siguiente"><Icon n="right" s={16} /></button>
            </nav>
          )}
        </footer>
      </div>

      <div className={`rs-bulk ${sel.size ? "is-on" : ""}`} role="status">
        <b>{sel.size} {sel.size === 1 ? "seleccionada" : "seleccionadas"}</b>
        <button type="button" className="rs-btn rs-btn--ghost" onClick={() => { void masivo("confirmada"); }}>Confirmar</button>
        <button type="button" className="rs-btn rs-btn--ghost" onClick={() => { void masivo("completada"); }}>Completar</button>
        <button type="button" className="rs-btn rs-btn--danger" onClick={() => setBorrar([...sel])}>Eliminar</button>
        <button type="button" className="rs-icon" onClick={() => setSel(new Set())} aria-label="Quitar selección"><Icon n="x" /></button>
      </div>

      {ver && <Panel r={ver} onCerrar={() => setVer(null)} onGuardar={(reservation) => solicitarGuardar(reservation, true)} />}

      {borrar && (
        <div className="rs-modal" role="dialog" aria-modal="true" aria-label="Confirmar eliminación">
          <button type="button" className="rs-overlay is-on" onClick={() => !borrando && setBorrar(null)} aria-label="Cerrar diálogo de eliminación" />
          <div className="rs-dialogo">
            <span className="rs-dialogo__ico"><Icon n="warn" s={26} /></span>
            <h3>{borrar.length === 1 ? `¿Eliminar la reserva #${borrar[0]}?` : `¿Eliminar ${borrar.length} reservas?`}</h3>
            <p>Esta acción no se puede deshacer. Si solo quieres que no cuente, desactívala con el interruptor.</p>
            <div><button type="button" className="rs-btn rs-btn--ghost" disabled={borrando} onClick={() => setBorrar(null)}>Cancelar</button><button type="button" className="rs-btn rs-btn--danger-solid" disabled={borrando} onClick={() => { void eliminar(); }}>{borrando ? "Eliminando..." : "Sí, eliminar"}</button></div>
          </div>
        </div>
      )}
      {pendingCancellation && (
        <div className="rs-modal" role="dialog" aria-modal="true" aria-labelledby="rs-cancel-title">
          <button type="button" className="rs-overlay is-on" onClick={() => setPendingCancellation(null)} aria-label="Cerrar diálogo de cancelación" />
          <div className="rs-dialogo rs-dialogo--cancel">
            <h3 id="rs-cancel-title">Motivo de cancelación</h3>
            <p>Escribe el motivo para cancelar la reserva #{pendingCancellation.reservation.id}.</p>
            <label className="rs-cancel-reason">Motivo
              <textarea value={cancellationReason} maxLength={500} onChange={(event) => setCancellationReason(event.target.value)} rows={4} autoFocus />
            </label>
            <small>{cancellationReason.length}/500 caracteres</small>
            <div>
              <button type="button" className="rs-btn rs-btn--ghost" onClick={() => setPendingCancellation(null)}>Volver</button>
              <button type="button" className="rs-btn rs-btn--danger-solid" disabled={!cancellationReason.trim()} onClick={() => { void confirmarCancelacion(); }}>Confirmar cancelación</button>
            </div>
          </div>
        </div>
      )}
      <div className={`rs-toast ${toast ? "is-on" : ""} ${toastError ? "is-error" : ""}`} role="status"><Icon n={toastError ? "warn" : "check"} s={16} />{toast}</div>
    </section>
  );
}
