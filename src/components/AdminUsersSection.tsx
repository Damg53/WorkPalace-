import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./admin-usuarios.css";
import type { AdminUser } from './adminTypes'
import type { CSSProperties, FormEvent, ReactNode } from "react";

type Role = "admin" | "propietario" | "usuario";
type UsuarioUI = { id: number; nombre: string; email: string; usuario: string; rol: Role; activo: boolean };
type RoleOption = { t: string; c: string };
type IconName = "search" | "x" | "pencil" | "trash" | "up" | "down" | "left" | "right" | "check" | "copy" | "shield" | "mail" | "warn";
type Order = { col: keyof UsuarioUI; dir: 1 | -1 };

interface AdminUsersSectionProps {
  users: AdminUser[]
  userId?: number
  updateRole: (id: number, role: string) => Promise<void>
  toggleUserActive: (id: number, active: boolean) => Promise<void>
  deleteUsers: (ids: number[]) => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
}

const ROLES: Record<Role, RoleOption> = {
  admin: { t: "Administrador", c: "#f0a951" },
  propietario: { t: "Propietario", c: "#7c6cff" },
  usuario: { t: "Usuario", c: "#3b73ff" },
};
const GRADS = [["#3b73ff", "#7c6cff"], ["#7c6cff", "#e0457b"], ["#2fa37a", "#3b73ff"], ["#f0803c", "#e0457b"], ["#f0a951", "#e0457b"], ["#e0457b", "#7c6cff"]];
const grad = (id: number) => GRADS[id % GRADS.length];

/* ---------- Utilidades ---------- */
const norm = (s: string) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const iniciales = (n: string) => n.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
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
  pencil: <path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" />,
  trash: <><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></>,
  up: <path d="m6 15 6-6 6 6" />, down: <path d="m6 9 6 6 6-6" />, left: <path d="m15 18-6-6 6-6" />, right: <path d="m9 18 6-6-6-6" />,
  check: <path d="M20 6 9 17l-5-5" />, copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />, mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>,
  warn: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
};
const Icon = ({ n, s = 18 }: { n: IconName; s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[n]}</svg>;

/* ---------- Piezas ---------- */
function Kpi({ titulo, valor, color, n }: { titulo: string; valor: number; color: string; n: number }) {
  const v = useContar(valor);
  return <div className="us-kpi" style={{ "--c": color, "--n": n } as CSSProperties}><span>{titulo}</span><strong>{v}</strong></div>;
}
const Switch = ({ activo, onChange, etiqueta, deshabilitado = false }: { activo: boolean; onChange: (activo: boolean) => void; etiqueta: string; deshabilitado?: boolean }) => (
  <button type="button" role="switch" aria-checked={activo} aria-label={etiqueta} disabled={deshabilitado} className={`us-switch ${activo ? "is-on" : ""}`} onClick={() => onChange(!activo)}><i /></button>
);
const Avatar = ({ u, s = 42 }: { u: UsuarioUI; s?: number }) => { const [a, b] = grad(u.id); return <span className="us-av" style={{ width: s, height: s, background: `linear-gradient(135deg, ${a}, ${b})` }}>{iniciales(u.nombre)}</span>; };

function Elegir({ valor, opciones, onElegir, etiqueta, deshabilitado = false }: { valor: Role; opciones: Record<Role, RoleOption>; onElegir: (role: Role) => void; etiqueta: string; deshabilitado?: boolean }) {
  const [pos, setPos] = useState<{ left: number; top: number; surface: string; line: string; text: string; ease: string; amber: string } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const o = opciones[valor];
  useEffect(() => {
    if (!pos) return;
    const cerrar = () => setPos(null);
    const fuera = (e: MouseEvent) => { if (!(e.target instanceof Element) || (!btn.current?.contains(e.target) && !e.target.closest(".us-pop"))) cerrar(); };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    document.addEventListener("mousedown", fuera); document.addEventListener("keydown", tecla);
    window.addEventListener("scroll", cerrar, true); window.addEventListener("resize", cerrar);
    return () => { document.removeEventListener("mousedown", fuera); document.removeEventListener("keydown", tecla); window.removeEventListener("scroll", cerrar, true); window.removeEventListener("resize", cerrar); };
  }, [pos]);
  const abrir = () => {
    if (pos) return setPos(null);
    if (!btn.current) return;
    const r = btn.current.getBoundingClientRect(), alto = Object.keys(opciones).length * 42 + 14;
    const theme = window.getComputedStyle(btn.current.closest(".us") ?? btn.current);
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
      <button ref={btn} type="button" disabled={deshabilitado} className="us-badge" style={{ "--c": o.c } as CSSProperties} aria-haspopup="listbox" aria-expanded={!!pos} aria-label={`${etiqueta}: ${o.t}. Cambiar`} onClick={abrir}>
        {valor === "admin" ? <Icon n="shield" s={14} /> : <i />}{o.t}<Icon n="down" s={14} />
      </button>
      {pos && (
        createPortal(
          <ul className="us-pop" role="listbox" style={{ top: pos.top, left: pos.left, color: pos.text, "--d-surface": pos.surface, "--d-line": pos.line, "--d-text": pos.text, "--d-ease": pos.ease, "--d-amber": pos.amber } as CSSProperties}>
            {(Object.entries(opciones) as [Role, RoleOption][]).map(([k, x]) => (
              <li key={k}><button type="button" role="option" aria-selected={k === valor} style={{ "--c": x.c } as CSSProperties} onClick={() => { setPos(null); onElegir(k); }}><i />{x.t}{k === valor && <Icon n="check" s={14} />}</button></li>
            ))}
          </ul>,
          document.body,
        )
      )}
    </>
  );
}

function Correo({ email }: { email: string }) {
  const [ok, setOk] = useState(false);
  const [failed, setFailed] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setFailed(false);
      setOk(true);
      setTimeout(() => setOk(false), 1600);
    } catch {
      setFailed(true);
      setTimeout(() => setFailed(false), 1600);
    }
  };
  return (
    <span className="us-email"><span>{email}</span>
      <button type="button" onClick={copiar} aria-label={`Copiar ${email}`} data-tip={failed ? "No se pudo copiar" : ok ? "¡Copiado!" : "Copiar"}><Icon n={ok ? "check" : "copy"} s={15} /></button>
    </span>
  );
}

function SortHeader({ col, order, onSort, children }: { col: keyof UsuarioUI; order: Order; onSort: (col: keyof UsuarioUI) => void; children: ReactNode }) {
  return (
    <th aria-sort={order.col === col ? (order.dir > 0 ? "ascending" : "descending") : "none"}>
      <button type="button" className={`us-sort ${order.col === col ? "is-on" : ""}`} onClick={() => onSort(col)}>{children}<span>{order.col === col ? <Icon n={order.dir > 0 ? "up" : "down"} s={14} /> : null}</span></button>
    </th>
  );
}

/* ---------- Panel de edición ---------- */
function Panel({ u, onCerrar, onGuardar, onRestablecer, soyYo, bloqueado }: {
  u: UsuarioUI;
  onCerrar: () => void;
  onGuardar: (user: UsuarioUI) => Promise<void>;
  onRestablecer: (user: UsuarioUI) => Promise<void>;
  soyYo: boolean;
  bloqueado: boolean;
}) {
  const [f, setF] = useState<UsuarioUI>(u);
  const [guardando, setGuardando] = useState(false);
  const set = <K extends keyof UsuarioUI>(k: K, v: UsuarioUI[K]) => setF((x) => ({ ...x, [k]: v }));
  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await onGuardar(f);
    } finally {
      setGuardando(false);
    }
  };
  const Campo = ({ label, children }: { label: string; children: ReactNode }) => <div className="us-campo"><label>{label}{children}</label></div>;

  return (
    <>
      <div className="us-overlay is-on" onClick={onCerrar} aria-hidden="true" />
      <form className="us-panel" onSubmit={enviar} aria-label={`Editar a ${u.nombre}`}>
        <header><div className="us-cab"><Avatar u={u} s={48} /><div><h2>{u.nombre}</h2><small>#{u.id}{soyYo && " · Tu cuenta"}</small></div></div><button type="button" className="us-icon" onClick={onCerrar} aria-label="Cerrar"><Icon n="x" /></button></header>
        <div className="us-panel__body">
          <Campo label="Nombre completo"><input value={f.nombre} readOnly /></Campo>
          <Campo label="Correo electrónico"><input type="email" value={f.email} readOnly /></Campo>
          <Campo label="Usuario"><input className="us-mono-in" value={f.usuario} readOnly /></Campo>
          <div className="us-campo"><span className="us-lbl">Rol</span><Elegir valor={f.rol} opciones={ROLES} etiqueta="Rol" deshabilitado={bloqueado} onElegir={(k) => set("rol", k)} />{bloqueado && <p className="us-nota">No puedes cambiar este rol: debe quedar al menos un administrador activo.</p>}</div>
          <div className="us-activo"><div><b>Cuenta activa</b><small>Si la desactivas, la persona no podrá iniciar sesión.</small></div><Switch activo={f.activo} onChange={(v) => set("activo", v)} etiqueta="Cuenta activa" deshabilitado={bloqueado} /></div>
          <button type="button" className="us-reset" onClick={() => onRestablecer(u)}><Icon n="mail" />Enviar enlace para restablecer la contraseña</button>
        </div>
        <footer><button type="button" className="us-btn us-btn--ghost" onClick={onCerrar}>Cancelar</button><button type="submit" className="us-btn us-btn--solid" disabled={guardando}>{guardando ? <><i className="us-spin" />Guardando</> : "Guardar cambios"}</button></footer>
      </form>
    </>
  );
}

/* ---------- Componente principal ---------- */
export default function AdminUsuarios({ users, userId, updateRole, toggleUserActive, deleteUsers, requestPasswordReset }: AdminUsersSectionProps) {
  const usuarios = useMemo<UsuarioUI[]>(() => users.map((user) => ({
    id: user.id,
    nombre: String(user.full_name ?? ''),
    email: String(user.email ?? ''),
    usuario: user.username ?? '',
    rol: user.role === 'owner' ? 'propietario' : user.role === 'user' ? 'usuario' : 'admin',
    activo: user.active !== false,
  })), [users])
  const yoId = userId ?? -1
  const apiRole = (role: Role) => role === 'propietario' ? 'owner' : role === 'usuario' ? 'user' : 'admin'
  const onRol = (id: number, role: Role) => updateRole(id, apiRole(role))
  const onActivo = (id: number, activo: boolean) => toggleUserActive(id, activo)
  const onEliminar = deleteUsers
  const onGuardar = async (user: UsuarioUI) => {
    const current = usuarios.find((item) => item.id === user.id)
    if (!current) return
    if (user.rol !== current.rol) await onRol(user.id, user.rol)
    if (user.activo !== current.activo) await onActivo(user.id, user.activo)
  }
  const onRestablecer = (user: UsuarioUI) => requestPasswordReset(user.email)
  const [lista, setLista] = useState(usuarios);
  const [q, setQ] = useState("");
  const [rol, setRol] = useState<Role | "todos">("todos");
  const [estado, setEstado] = useState<"todos" | "activos" | "inactivos">("todos");
  const [orden, setOrden] = useState<Order>({ col: "id", dir: 1 });
  const [pag, setPag] = useState(1);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [edit, setEdit] = useState<UsuarioUI | null>(null);
  const [borrar, setBorrar] = useState<number[] | null>(null);
  const [admin, setAdmin] = useState<{ u: UsuarioUI; nuevo: Role } | null>(null);
  const [toast, setToast] = useState<{ m: string; mal: boolean } | null>(null);
  const buscar = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const POR_PAGINA = 8;

  // Keep the copied prototype's local controls synchronized with data refreshed by the admin hook.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setLista(usuarios), [usuarios])
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName ?? "")) { e.preventDefault(); buscar.current?.focus(); }
      if (e.key === "Escape") { setEdit(null); setBorrar(null); setAdmin(null); }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  const avisar = (m: string, mal = false) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ m, mal });
    timer.current = setTimeout(() => setToast(null), 4000);
  };

  const admins = lista.filter((u) => u.rol === "admin" && u.activo);
  const esUltimoAdmin = (u: UsuarioUI | undefined) => u?.rol === "admin" && u.activo && admins.length === 1;
  const cuenta = (k: Role) => lista.filter((u) => u.rol === k).length;

  const filtrada = useMemo(() => {
    const t = norm(q.trim());
    const r = lista.filter((u) => (rol === "todos" || u.rol === rol) && (estado === "todos" || (estado === "activos") === u.activo) && (!t || norm(`${u.nombre} ${u.email} ${u.usuario} #${u.id}`).includes(t)));
    const { col, dir } = orden;
    return [...r].sort((a, b) => {
      const left = a[col];
      const right = b[col];
      const comparison = typeof left === "string" ? left.localeCompare(String(right), "es") : Number(left) - Number(right);
      return comparison * dir;
    });
  }, [lista, q, rol, estado, orden]);

  const paginas = Math.max(1, Math.ceil(filtrada.length / POR_PAGINA));
  const pagina = Math.min(pag, paginas);
  const visibles = filtrada.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const hayFiltros = q || rol !== "todos" || estado !== "todos";
  const limpiar = () => { setQ(""); setRol("todos"); setEstado("todos"); };

  /* Acciones con reglas de seguridad */
  const cambiarRol = (u: UsuarioUI, nuevo: Role) => {
    if (nuevo === u.rol) return;
    if (u.rol === "admin" && esUltimoAdmin(u)) return avisar("Debe quedar al menos un administrador activo.", true);
    if (u.id === yoId && u.rol === "admin") return avisar("No puedes quitarte tu propio rol de administrador.", true);
    if (nuevo === "admin") return setAdmin({ u, nuevo });
    aplicarRol(u, nuevo);
  };
  const aplicarRol = async (u: UsuarioUI, nuevo: Role) => {
    try {
      await onRol(u.id, nuevo);
      setLista((l) => l.map((x) => (x.id === u.id ? { ...x, rol: nuevo } : x)));
      avisar(`${u.nombre} ahora es ${ROLES[nuevo].t.toLowerCase()}`);
      setAdmin(null);
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo actualizar el rol.", true);
    }
  };
  const cambiarActivo = async (u: UsuarioUI, v: boolean) => {
    if (!v && u.id === yoId) return avisar("No puedes desactivar tu propia cuenta.", true);
    if (!v && esUltimoAdmin(u)) return avisar("Debe quedar al menos un administrador activo.", true);
    try {
      await onActivo(u.id, v);
      setLista((l) => l.map((x) => (x.id === u.id ? { ...x, activo: v } : x)));
      avisar(`${u.nombre}: cuenta ${v ? "activada" : "desactivada"}`);
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo actualizar el estado.", true);
    }
  };
  const puedeBorrar = (u: UsuarioUI | undefined) => !!u && u.id !== yoId && !esUltimoAdmin(u);
  const pedirBorrado = (ids: number[]) => {
    const permitidos = ids.filter((id) => puedeBorrar(lista.find((x) => x.id === id)));
    if (!permitidos.length) return avisar("No puedes eliminar tu cuenta ni al último administrador.", true);
    setBorrar(permitidos);
  };
  const eliminar = async () => {
    const ids = borrar;
    if (!ids) return;
    try {
      await onEliminar(ids);
      setLista((l) => l.filter((x) => !ids.includes(x.id)));
      setSel(new Set());
      setBorrar(null);
      avisar(ids.length === 1 ? "Usuario eliminado" : `${ids.length} usuarios eliminados`);
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudieron eliminar los usuarios.", true);
    }
  };
  const guardar = async (u: UsuarioUI) => {
    try {
      await onGuardar(u);
      setLista((l) => l.map((x) => (x.id === u.id ? u : x)));
      setEdit(null);
      avisar("Cambios guardados");
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudieron guardar los cambios.", true);
    }
  };
  const restablecer = async (u: UsuarioUI) => {
    try {
      await onRestablecer(u);
      avisar(`Enlace solicitado para ${u.email}`);
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo solicitar el restablecimiento.", true);
    }
  };

  const ordenar = (col: keyof UsuarioUI) => setOrden((o) => (o.col === col ? { col, dir: o.dir === 1 ? -1 : 1 } : { col, dir: 1 }));
  const marcar = (id: number) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const todosPagina = visibles.length > 0 && visibles.every((u) => sel.has(u.id));
  const algunoPagina = visibles.some((u) => sel.has(u.id));
  const marcarPagina = () => setSel((s) => { const n = new Set(s); visibles.forEach((u) => (todosPagina ? n.delete(u.id) : n.add(u.id))); return n; });
  const masivoActivo = async (v: boolean) => {
    const ids = [...sel].filter((id) => { const u = lista.find((x) => x.id === id); return !!u && (v || (u.id !== yoId && !esUltimoAdmin(u))); });
    const updated: number[] = [];
    for (const id of ids) {
      try {
        await onActivo(id, v);
        updated.push(id);
      } catch (error) {
        setLista((l) => l.map((x) => (updated.includes(x.id) ? { ...x, activo: v } : x)));
        avisar(error instanceof Error ? error.message : "No se pudo actualizar el estado.", true);
        setSel(new Set());
        return;
      }
    }
    setLista((l) => l.map((x) => (updated.includes(x.id) ? { ...x, activo: v } : x)));
    avisar(`${updated.length} ${updated.length === 1 ? "cuenta" : "cuentas"} ${v ? "activadas" : "desactivadas"}`);
    setSel(new Set());
  };

  return (
    <section className="us">
      <div className="us-kpis">
        <Kpi n={0} color="#7c6cff" titulo="Total de usuarios" valor={lista.length} />
        <Kpi n={1} color="#f0a951" titulo="Administradores" valor={cuenta("admin")} />
        <Kpi n={2} color="#7c6cff" titulo="Propietarios" valor={cuenta("propietario")} />
        <Kpi n={3} color="#3b73ff" titulo="Usuarios" valor={cuenta("usuario")} />
      </div>

      <div className="us-tabla-wrap">
        <div className="us-barra">
          <label className="us-buscar">
            <Icon n="search" />
            <input ref={buscar} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, correo o usuario" aria-label="Buscar usuarios" />
            {q ? <button type="button" onClick={() => setQ("")} aria-label="Borrar búsqueda"><Icon n="x" s={15} /></button> : <kbd>/</kbd>}
          </label>
          <div className="us-seg" role="radiogroup" aria-label="Estado de la cuenta" style={{ "--i": ["todos", "activos", "inactivos"].indexOf(estado) } as CSSProperties}>
            <span aria-hidden="true" />
            {(["todos", "activos", "inactivos"] as const).map((k) => <button key={k} role="radio" aria-checked={estado === k} onClick={() => setEstado(k)}>{k === "todos" ? "Todos" : k === "activos" ? "Activos" : "Inactivos"}</button>)}
          </div>
          {hayFiltros && <button className="us-link" onClick={limpiar}>Limpiar filtros</button>}
        </div>
        <div className="us-fchips" role="radiogroup" aria-label="Rol">
          <button role="radio" aria-checked={rol === "todos"} className={rol === "todos" ? "is-on" : ""} style={{ "--c": "#7c6cff" } as CSSProperties} onClick={() => setRol("todos")}>Todos los roles<em>{lista.length}</em></button>
          {(Object.entries(ROLES) as [Role, RoleOption][]).map(([k, r]) => <button key={k} role="radio" aria-checked={rol === k} className={rol === k ? "is-on" : ""} style={{ "--c": r.c } as CSSProperties} onClick={() => setRol(k)}><i />{r.t}<em>{cuenta(k)}</em></button>)}
        </div>

        {visibles.length ? (
          <div className="us-scroll">
            <table className="us-tabla">
              <thead>
                <tr>
                  <th className="us-chk"><input type="checkbox" aria-label="Seleccionar todos" checked={todosPagina} ref={(el) => { if (el) el.indeterminate = algunoPagina && !todosPagina; }} onChange={marcarPagina} /></th>
                  <SortHeader col="nombre" order={orden} onSort={ordenar}>Usuario</SortHeader><th>Correo</th><SortHeader col="rol" order={orden} onSort={ordenar}>Rol</SortHeader><th>Cuenta</th><th className="us-acc-th">Acciones</th>
                </tr>
              </thead>
              <tbody key={`${pagina}${q}${rol}${estado}${orden.col}${orden.dir}`}>
                {visibles.map((u, i) => {
                  const yo = u.id === yoId, [a] = grad(u.id), protegido = !puedeBorrar(u);
                  return (
                    <tr key={u.id} className={`${!u.activo ? "is-off" : ""} ${sel.has(u.id) ? "is-sel" : ""}`} style={{ "--a": a, "--n": i } as CSSProperties}>
                      <td className="us-chk"><input type="checkbox" aria-label={`Seleccionar a ${u.nombre}`} checked={sel.has(u.id)} onChange={() => marcar(u.id)} /></td>
                      <td data-label="Usuario"><div className="us-user"><Avatar u={u} /><div><b>{u.nombre}{yo && <em className="us-yo">Tú</em>}</b><small className="us-mono">@{u.usuario} · #{u.id}</small></div></div></td>
                      <td data-label="Correo"><Correo email={u.email} /></td>
                      <td data-label="Rol"><Elegir valor={u.rol} opciones={ROLES} etiqueta={`Rol de ${u.nombre}`} onElegir={(k) => cambiarRol(u, k)} /></td>
                      <td data-label="Estado"><div className="us-estado"><Switch activo={u.activo} onChange={(v) => cambiarActivo(u, v)} etiqueta={`${u.activo ? "Desactivar" : "Activar"} la cuenta de ${u.nombre}`} /><span>{u.activo ? "Activa" : "Inactiva"}</span></div></td>
                      <td data-label="Acciones" className="us-acc">
                        <div className="us-action-group">
                          <button className="us-icon" onClick={() => setEdit(u)} aria-label={`Editar a ${u.nombre}`} data-tip="Editar"><Icon n="pencil" /></button>
                          <button className="us-icon us-icon--bad" disabled={protegido} onClick={() => pedirBorrado([u.id])} aria-label={`Eliminar a ${u.nombre}`} data-tip={protegido ? (yo ? "No puedes eliminarte" : "Último administrador") : "Eliminar"}><Icon n="trash" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="us-vacio"><span><Icon n="search" s={26} /></span><b>No encontramos usuarios</b><p>Prueba con otra búsqueda o cambia los filtros.</p><button className="us-btn us-btn--ghost" onClick={limpiar}>Limpiar filtros</button></div>
        )}

        <footer className="us-pie">
          <span>{filtrada.length} {filtrada.length === 1 ? "resultado" : "resultados"}</span>
          {paginas > 1 && (
            <nav className="us-pager" aria-label="Paginación">
              <button disabled={pagina === 1} onClick={() => setPag(pagina - 1)} aria-label="Anterior"><Icon n="left" s={16} /></button>
              {Array.from({ length: paginas }, (_, i) => <button key={i} className={pagina === i + 1 ? "is-on" : ""} aria-current={pagina === i + 1 ? "page" : undefined} onClick={() => setPag(i + 1)}>{i + 1}</button>)}
              <button disabled={pagina === paginas} onClick={() => setPag(pagina + 1)} aria-label="Siguiente"><Icon n="right" s={16} /></button>
            </nav>
          )}
        </footer>
      </div>

      <div className={`us-bulk ${sel.size ? "is-on" : ""}`} role="status">
        <b>{sel.size} {sel.size === 1 ? "seleccionado" : "seleccionados"}</b>
        <button className="us-btn us-btn--ghost" onClick={() => masivoActivo(true)}>Activar</button>
        <button className="us-btn us-btn--ghost" onClick={() => masivoActivo(false)}>Desactivar</button>
        <button className="us-btn us-btn--danger" onClick={() => pedirBorrado([...sel])}>Eliminar</button>
        <button className="us-icon" onClick={() => setSel(new Set())} aria-label="Quitar selección"><Icon n="x" /></button>
      </div>

      {edit && <Panel u={edit} soyYo={edit.id === yoId} bloqueado={esUltimoAdmin(edit)} onCerrar={() => setEdit(null)} onGuardar={guardar} onRestablecer={restablecer} />}

      {(borrar || admin) && (
        <div className="us-modal" role="dialog" aria-modal="true">
          <div className="us-overlay is-on" onClick={() => { setBorrar(null); setAdmin(null); }} aria-hidden="true" />
          {borrar ? (
            <div className="us-dialogo">
              <span className="us-dialogo__ico"><Icon n="warn" s={26} /></span>
              <h3>{borrar.length === 1 ? `¿Eliminar a ${lista.find((x) => x.id === borrar[0])?.nombre}?` : `¿Eliminar ${borrar.length} usuarios?`}</h3>
              <p>Se borrará su cuenta y sus datos. Esta acción no se puede deshacer. Si solo quieres bloquear el acceso, desactiva la cuenta.</p>
              <div><button className="us-btn us-btn--ghost" onClick={() => setBorrar(null)}>Cancelar</button><button className="us-btn us-btn--danger-solid" onClick={eliminar}>Sí, eliminar</button></div>
            </div>
          ) : admin && (
            <div className="us-dialogo">
              <span className="us-dialogo__ico us-dialogo__ico--amber"><Icon n="shield" s={26} /></span>
              <h3>¿Dar permisos de administrador a {admin.u.nombre}?</h3>
              <p>Podrá ver y modificar usuarios, espacios y reservas de toda la plataforma.</p>
              <div><button className="us-btn us-btn--ghost" onClick={() => setAdmin(null)}>Cancelar</button><button className="us-btn us-btn--solid" onClick={() => aplicarRol(admin.u, admin.nuevo)}>Sí, hacerlo administrador</button></div>
            </div>
          )}
        </div>
      )}

      <div className={`us-toast ${toast ? "is-on" : ""} ${toast?.mal ? "is-mal" : ""}`} role="status"><Icon n={toast?.mal ? "warn" : "check"} s={16} />{toast?.m}</div>
    </section>
  );
}
