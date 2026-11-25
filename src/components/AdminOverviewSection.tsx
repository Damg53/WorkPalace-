import { useEffect, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import type { AdminCoupon, AdminPlace, AdminReservation, AdminUser } from "./adminTypes";

type SeriesKey = "usuarios" | "reservas" | "lugares";
type AlertItem = { id: string; message: string; okay: boolean };
type Point = [number, number];

interface AdminOverviewSectionProps {
  users: AdminUser[];
  reservations: AdminReservation[];
  places: AdminPlace[];
  coupons: AdminCoupon[];
  onRefresh: () => Promise<void>;
}

const COMPLETED_COLOR = "#3ccf82";
const INITIAL_VISIBLE_CITY_COUNT = 3;
const ESTADOS = [
  ["pendientes", "Pendientes", "#f0a951"],
  ["confirmadas", "Confirmadas", "#3b73ff"],
  ["completadas", "Completadas", COMPLETED_COLOR],
  ["canceladas", "Canceladas", "#ff7a8a"],
] as const;
const SERIES: { key: SeriesKey; label: string; color: string }[] = [
  { key: "usuarios", label: "Usuarios", color: "#7c6cff" },
  { key: "reservas", label: "Reservas", color: "#f0a951" },
  { key: "lugares", label: "Lugares", color: "#3ccf82" },
];
const DAY_MS = 24 * 60 * 60 * 1000;
const pesos = (value: number) => "$ " + Math.round(value).toLocaleString("es-CO");
const accumulated = (values: number[]) => values.reduce<number[]>((result, value, index) => {
  result.push((result[index - 1] || 0) + value);
  return result;
}, []);
const text = (value: unknown, fallback: string) => typeof value === "string" && value.trim() ? value : fallback;

function monotoneCurve(points: Point[]) {
  const intervals: number[] = [];
  const slopes: number[] = [];
  const tangents: number[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    intervals[index] = points[index + 1][0] - points[index][0];
    slopes[index] = (points[index + 1][1] - points[index][1]) / intervals[index];
  }
  tangents[0] = slopes[0];
  tangents[points.length - 1] = slopes[slopes.length - 1];
  for (let index = 1; index < points.length - 1; index += 1) {
    tangents[index] = slopes[index - 1] * slopes[index] <= 0 ? 0 : (slopes[index - 1] + slopes[index]) / 2;
  }
  for (let index = 0; index < slopes.length; index += 1) {
    if (slopes[index] === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      continue;
    }
    const first = tangents[index] / slopes[index];
    const second = tangents[index + 1] / slopes[index];
    const magnitude = first * first + second * second;
    if (magnitude > 9) {
      const factor = 3 / Math.sqrt(magnitude);
      tangents[index] = factor * first * slopes[index];
      tangents[index + 1] = factor * second * slopes[index];
    }
  }
  let path = `M${points[0][0]},${points[0][1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const third = intervals[index] / 3;
    path += `C${points[index][0] + third},${points[index][1] + tangents[index] * third} ${points[index + 1][0] - third},${points[index + 1][1] - tangents[index + 1] * third} ${points[index + 1][0]},${points[index + 1][1]}`;
  }
  return path;
}

function bogotaDate(timestamp: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function recentFirst<T extends { created_at?: string }>(items: T[]) {
  return [...items].sort((first, second) => {
    const firstTime = first.created_at ? Date.parse(first.created_at) : Number.NEGATIVE_INFINITY;
    const secondTime = second.created_at ? Date.parse(second.created_at) : Number.NEGATIVE_INFINITY;
    return (Number.isFinite(secondTime) ? secondTime : Number.NEGATIVE_INFINITY)
      - (Number.isFinite(firstTime) ? firstTime : Number.NEGATIVE_INFINITY);
  });
}

function dailyCounts<T extends { created_at?: string }>(items: T[], now: number) {
  const dates = Array.from({ length: 30 }, (_, index) => bogotaDate(now - (29 - index) * DAY_MS));
  const positions = new Map(dates.map((date, index) => [date, index]));
  const values = Array<number>(dates.length).fill(0);
  for (const item of items) {
    if (!item.created_at) continue;
    const timestamp = Date.parse(item.created_at);
    if (!Number.isFinite(timestamp)) continue;
    const position = positions.get(bogotaDate(timestamp));
    if (position !== undefined) values[position] += 1;
  }
  return { dates, values };
}

function dateLabel(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", ...options })
    .format(new Date(`${date}T12:00:00-05:00`));
}

function Icon({ name }: { name: "users" | "calendar" | "home" | "check" | "refresh" }) {
  const paths = {
    users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.2 2.4 3.5 5.2" /></>,
    calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></>,
    home: <path d="M3.5 11 12 4l8.5 7M6 9.5V20h12V9.5" />,
    check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
    refresh: <path d="M20 11a8 8 0 0 0-14.5-4M4 5v3.5h3.5M4 13a8 8 0 0 0 14.5 4M20 19v-3.5h-3.5" />,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function Spark({ id, values, color }: { id: string; values: number[]; color: string }) {
  const totals = accumulated(values);
  const width = 300;
  const height = 64;
  const maximum = Math.max(1, totals.at(-1) || 0);
  const points = totals.map((value, index) => [
    (index / Math.max(1, totals.length - 1)) * width,
    height - 6 - (value / maximum) * (height - 18),
  ] as Point);
  const path = monotoneCurve(points);
  return (
    <svg className="pc-spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${path}L${width},${height}L0,${height}Z`} fill={`url(#${id})`} stroke="none" />
      <path className="l" d={path} />
    </svg>
  );
}

function Area({ values, dates, color, name }: { values: number[]; dates: string[]; color: string; name: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const width = 720;
  const height = 270;
  const padding = { left: 34, right: 12, top: 18, bottom: 30 };
  const totals = accumulated(values);
  const count = totals.length;
  const top = Math.max(4, Math.ceil((totals[count - 1] || 0) / 4) * 4);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const x = (index: number) => padding.left + (index / Math.max(1, count - 1)) * innerWidth;
  const y = (value: number) => padding.top + innerHeight - (value / top) * innerHeight;
  const path = monotoneCurve(totals.map((value, index) => [x(index), y(value)]));
  const move = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const pixelX = ((event.clientX - bounds.left) / bounds.width) * width;
    setHovered(Math.max(0, Math.min(count - 1, Math.round(((pixelX - padding.left) / innerWidth) * (count - 1)))));
  };
  const gradientId = `pc-area-${name}`;
  const shownDate = hovered === null ? "" : dateLabel(dates[hovered], { day: "numeric", month: "short" });
  return (
    <div className="pc-plot">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${name} acumulados en 30 días`} onPointerMove={move} onPointerLeave={() => setHovered(null)}>
        <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".45" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        {[0, 1, 2, 3, 4].map((step) => (
          <g key={step}>
            <line className="gl" x1={padding.left} x2={width - padding.right} y1={y((top / 4) * step)} y2={y((top / 4) * step)} />
            <text x={padding.left - 10} y={y((top / 4) * step) + 4} textAnchor="end">{(top / 4) * step}</text>
          </g>
        ))}
        {[0, 7, 14, 22, 29].map((index) => (
          <text key={index} x={x(index)} y={height - 8} textAnchor={index === 0 ? "start" : index === 29 ? "end" : "middle"}>
            {index === 29 ? "Hoy" : dateLabel(dates[index], { day: "numeric", month: "short" })}
          </text>
        ))}
        <path className="pc-area" d={`${path}L${x(count - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={`url(#${gradientId})`} stroke="none" />
        <path className="pc-line" d={path} pathLength="100" stroke={color} />
        {hovered !== null && <>
          <line className="pc-cross" x1={x(hovered)} x2={x(hovered)} y1={padding.top} y2={y(0)} />
          <circle className="pc-dot" cx={x(hovered)} cy={y(totals[hovered])} r="6" fill={color} />
        </>}
      </svg>
      {hovered !== null && (
        <div className="pc-tip" style={{ left: `${(x(hovered) / width) * 100}%`, top: `${(y(totals[hovered]) / height) * 100}%` }}>
          {shownDate}<b>{totals[hovered]} {name.toLowerCase()}</b>
          {values[hovered] ? `+${values[hovered]} ese día` : "Sin cambios ese día"}
        </div>
      )}
    </div>
  );
}

function Gauge({ percent }: { percent: number }) {
  const arc = "M20 100A80 80 0 0 1 180 100";
  return (
    <div className="pc-gauge">
      <svg viewBox="0 0 200 110" role="img" aria-label={`${percent}% de reservas completadas`}>
        <path className="pc-track" fill="none" strokeWidth="16" strokeLinecap="round" d={arc} />
        {percent > 0 && <path className="pc-gauge-arc" d={arc} pathLength="100" stroke={COMPLETED_COLOR} strokeDasharray={`${percent} 100`} />}
      </svg>
      <div className="pc-gauge-c"><b>{percent}%</b><span>completadas</span></div>
    </div>
  );
}

function Feed({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="pc-card pc-feed pc-s4">
      <header><h2>{title}</h2><span>{count}</span></header>
      <ul>{children}</ul>
    </section>
  );
}

export default function AdminOverviewSection({ users, reservations, places, coupons, onRefresh }: AdminOverviewSectionProps) {
  const [now, setNow] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<SeriesKey>("usuarios");
  const [showAllCities, setShowAllCities] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);
  const userDaily = dailyCounts(users, now);
  const reservationDaily = dailyCounts(reservations, now);
  const placeDaily = dailyCounts(places, now);
  const usersSeries = userDaily.values;

  const activeUsers = users.filter((user) => user.active !== false);
  const inactiveUsers = users.length - activeUsers.length;
  const inactivePlaces = places.filter((place) => place.active === false).length;
  const publishedPlaces = places.filter((place) => place.active !== false);
  const admins = users.filter((user) => user.role === "admin");
  const regularUsers = users.filter((user) => user.role === "user");
  const owners = users.filter((user) => user.role === "owner");
  const otherRoles = Math.max(0, users.length - admins.length - regularUsers.length - owners.length);
  const reservationStates = {
    pendientes: reservations.filter((item) => item.estado === "pendiente").length,
    confirmadas: reservations.filter((item) => item.estado === "confirmada").length,
    completadas: reservations.filter((item) => item.estado === "completada").length,
    canceladas: reservations.filter((item) => item.estado === "cancelada").length,
  };
  const totalStates = Object.values(reservationStates).reduce((sum, value) => sum + value, 0);
  const completedPercent = totalStates ? Math.round((reservationStates.completadas / totalStates) * 100) : 0;
  const cities = publishedPlaces.reduce<Record<string, number>>((counts, place) => {
    const city = text(place.ciudad, "Sin ciudad");
    counts[city] = (counts[city] || 0) + 1;
    return counts;
  }, {});
  const topCities = Object.entries(cities).sort(([firstCity, firstCount], [secondCity, secondCount]) =>
    secondCount - firstCount || firstCity.localeCompare(secondCity, "es")
  );
  const visibleCities = showAllCities
    ? topCities
    : topCities.slice(0, INITIAL_VISIBLE_CITY_COUNT);
  const today = bogotaDate(now);
  const todayLabel = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(now));
  const nextDayDate = new Date(`${today}T00:00:00.000Z`);
  nextDayDate.setUTCDate(nextDayDate.getUTCDate() + 1);
  const tomorrow = nextDayDate.toISOString().slice(0, 10);

  const couponExpirations = coupons
    .filter((coupon) => coupon.active && coupon.ends_at)
    .map((coupon) => {
      const date = coupon.ends_at?.slice(0, 10) || "";
      const time = coupon.ends_at_time?.slice(0, 5) || null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) return null;
      const expiresAt = Date.parse(`${date}T${time ? `${time}:00` : "23:59:59"}-05:00`);
      return Number.isFinite(expiresAt) ? { coupon, date, time, expiresAt } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const expiringCoupons = couponExpirations
    .filter((item) => item.expiresAt >= now && item.expiresAt <= now + 7 * DAY_MS)
    .sort((first, second) => first.expiresAt - second.expiresAt);
  const expiredCoupons = couponExpirations.filter((item) => item.expiresAt < now).length;
  const nextExpiry = expiringCoupons[0];
  const nextExpiryLabel = nextExpiry
    ? `${nextExpiry.date === today ? "hoy" : nextExpiry.date === tomorrow ? "mañana" : dateLabel(nextExpiry.date, { day: "numeric", month: "short" })}${nextExpiry.time ? ` a las ${nextExpiry.time}` : " al final del día"}`
    : "";
  const couponMessage = [
    expiredCoupons ? `${expiredCoupons} cupón${expiredCoupons === 1 ? "" : "es"} activo${expiredCoupons === 1 ? "" : "s"} ya vencido${expiredCoupons === 1 ? "" : "s"}.` : "",
    expiringCoupons.length === 1
      ? `1 cupón vence ${nextExpiryLabel}.`
      : expiringCoupons.length > 1
        ? `${expiringCoupons.length} cupones vencen en los próximos 7 días. El próximo vence ${nextExpiryLabel}.`
        : "",
  ].filter(Boolean).join(" ") || "No hay cupones próximos a vencer.";
  const alerts: AlertItem[] = [
    { id: "reservations", message: reservationStates.pendientes ? `${reservationStates.pendientes} reserva${reservationStates.pendientes === 1 ? "" : "s"} pendiente${reservationStates.pendientes === 1 ? "" : "s"} de revisión.` : "No hay reservas pendientes.", okay: reservationStates.pendientes === 0 },
    { id: "users", message: inactiveUsers ? `${inactiveUsers} usuario${inactiveUsers === 1 ? "" : "s"} desactivado${inactiveUsers === 1 ? "" : "s"}.` : "Todos los usuarios están activos.", okay: inactiveUsers === 0 },
    { id: "places", message: inactivePlaces ? `${inactivePlaces} lugar${inactivePlaces === 1 ? "" : "es"} desactivado${inactivePlaces === 1 ? "" : "s"}.` : "Todos los lugares están publicados.", okay: inactivePlaces === 0 },
    { id: "coupons", message: couponMessage, okay: expiredCoupons === 0 && expiringCoupons.length === 0 },
  ];
  const attentionCount = alerts.filter((alert) => !alert.okay).length;

  const totalIncome = reservations.reduce((sum, reservation) => {
    if (reservation.estado === "cancelada" || reservation.total_amount == null) return sum;
    const amount = Number(reservation.total_amount);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);
  const activeReservations = reservations.filter((reservation) => reservation.estado !== "cancelada" && reservation.total_amount != null);
  const hasEstimatedIncome = reservations.some((reservation) => reservation.total_amount_estimated === true && reservation.estado !== "cancelada");
  const incomeStart = now - 30 * DAY_MS;
  const recentIncome = reservations.reduce((sum, reservation) => {
    if (reservation.estado === "cancelada" || reservation.total_amount == null || !reservation.created_at) return sum;
    const createdAt = Date.parse(reservation.created_at);
    const amount = Number(reservation.total_amount);
    return Number.isFinite(createdAt) && createdAt >= incomeStart && createdAt <= now && Number.isFinite(amount) ? sum + amount : sum;
  }, 0);
  const averageIncome = activeReservations.length ? totalIncome / activeReservations.length : 0;

  const series = {
    usuarios: userDaily,
    reservas: reservationDaily,
    lugares: placeDaily,
  };
  const selectedSeries = SERIES.find((item) => item.key === tab) || SERIES[0];
  const selectedValues = series[tab].values;
  const activityCount = selectedValues.reduce((sum, value) => sum + value, 0);
  const recentUsers = recentFirst(users).slice(0, 4);
  const recentReservations = recentFirst(reservations).slice(0, 4);
  const recentPlaces = recentFirst(places).slice(0, 4);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
      setNow(Date.now());
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="pc">
      <div className="pc-top">
        <div><p>{todayLabel}</p></div>
        <button type="button" className={`pc-btn ${refreshing ? "is-refreshing" : ""}`} onClick={() => { void refresh(); }} disabled={refreshing}>
          <Icon name="refresh" />{refreshing ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      <div className="pc-grid">
        <section className="pc-card pc-hero pc-s7" style={{ "--tone": attentionCount ? "var(--p-amber)" : "#3ccf82" } as CSSProperties}>
          <div className="pc-hero-head">
            <div className="pc-ring"><Icon name="check" /></div>
            <div>
              <h2>{attentionCount ? `${attentionCount} ${attentionCount === 1 ? "asunto por revisar" : "asuntos por revisar"}` : "Todo en orden"}</h2>
              <p>{attentionCount ? "Revisa los puntos marcados." : "Nada requiere tu atención ahora mismo."}</p>
            </div>
          </div>
          <ul className="pc-checks">
            {alerts.map((alert) => <li key={alert.id} className={alert.okay ? "" : "warn"}><Icon name="check" />{alert.message}</li>)}
          </ul>
        </section>

        <section className="pc-card pc-rev pc-s5">
          <svg viewBox="0 0 300 300" aria-hidden="true">{[40, 80, 120, 148].map((radius) => <circle key={radius} cx="150" cy="150" r={radius} />)}</svg>
          <div><small>Ingresos registrados</small><strong>{pesos(totalIncome)}</strong></div>
          <p>Ingresos de reservas no canceladas con monto registrado.</p>
          {hasEstimatedIncome && <p className="pc-rev-estimate">Incluye estimaciones de reservas antiguas que no guardaron su monto original.</p>}
          <div className="pc-rev-row">
            <div><span>Últimos 30 días</span><b>{pesos(recentIncome)}</b></div>
            <div><span>Promedio por reserva</span><b>{pesos(averageIncome)}</b></div>
          </div>
        </section>

        <section className="pc-card pc-kpi pc-s4" style={{ "--c": "#7c6cff" } as CSSProperties}>
          <div className="pc-kpi-top"><div className="pc-ico"><Icon name="users" /></div>Usuarios</div>
          <b>{users.length}</b>
          <div className="pc-tags"><span style={{ "--t": "#3ccf82" } as CSSProperties}>{activeUsers.length} activos</span><span style={{ "--t": "#3b73ff" } as CSSProperties}>{admins.length} admins</span><span style={{ "--t": "#e0457b" } as CSSProperties}>{regularUsers.length} regulares</span></div>
          <Spark id="pc-spark-users" values={usersSeries} color="#7c6cff" />
        </section>
        <section className="pc-card pc-kpi pc-s4" style={{ "--c": "#f0a951" } as CSSProperties}>
          <div className="pc-kpi-top"><div className="pc-ico"><Icon name="calendar" /></div>Reservas</div>
          <b>{reservations.length}</b>
          <div className="pc-tags"><span style={{ "--t": reservationStates.pendientes ? "#f0a951" : "#3ccf82" } as CSSProperties}>{reservationStates.pendientes} pendientes</span><span style={{ "--t": "#3ccf82" } as CSSProperties}>{reservationStates.completadas} completadas</span></div>
          <Spark id="pc-spark-reservations" values={reservationDaily.values} color="#f0a951" />
        </section>
        <section className="pc-card pc-kpi pc-s4" style={{ "--c": "#3ccf82" } as CSSProperties}>
          <div className="pc-kpi-top"><div className="pc-ico"><Icon name="home" /></div>Lugares activos</div>
          <b>{publishedPlaces.length}</b>
          <div className="pc-tags"><span>{topCities[0] ? `${topCities[0][1]} en ${topCities[0][0]}` : "Sin lugares publicados"}</span><span style={{ "--t": "#3b73ff" } as CSSProperties}>{topCities.length} ciudades</span></div>
          <Spark id="pc-spark-places" values={placeDaily.values} color="#3ccf82" />
        </section>

        <section className="pc-card pc-s8">
          <div className="pc-area-head">
            <div>
              <h2>Actividad de los últimos 30 días</h2>
              <div className="pc-area-num">{activityCount}<small>{selectedSeries.label.toLowerCase()} nuevos</small></div>
            </div>
            <div className="pc-tabs" role="tablist" aria-label="Tipo de actividad">
              {SERIES.map((item) => <button type="button" key={item.key} role="tab" aria-selected={tab === item.key} onClick={() => setTab(item.key)}>{item.label}</button>)}
            </div>
          </div>
          <Area key={tab} values={selectedValues} dates={series[tab].dates} color={selectedSeries.color} name={selectedSeries.label} />
          <p className="pc-note">Acumulado por día, según la fecha de creación de cada registro.</p>
        </section>

        <section className="pc-card pc-s4">
          <header><h2>Estado de reservas</h2><span>{reservations.length} en total</span></header>
          <Gauge percent={completedPercent} />
          {ESTADOS.map(([key, label, color]) => (
            <div className="pc-st" key={key} style={{ "--c": color, "--w": `${reservations.length ? (reservationStates[key] / reservations.length) * 100 : 0}%` } as CSSProperties}>
              <div>{label}<b>{reservationStates[key]}</b></div><i />
            </div>
          ))}
        </section>

        <section className="pc-card pc-s6">
          <header><h2>Lugares por ciudad</h2><span>{publishedPlaces.length} publicados</span></header>
          {topCities.length ? (
            <>
              <div className={`pc-city-list${showAllCities ? " is-expanded" : ""}`}>
                {visibleCities.map(([city, count], index) => {
                  const percentage = publishedPlaces.length ? (count / publishedPlaces.length) * 100 : 0;
                  return (
                    <div className="pc-city" key={city}>
                      <div className="pc-city-top"><span>{city}</span><b>{count}<small>{Math.round(percentage)}%</small></b></div>
                      <div><i style={{ width: `${percentage}%`, animationDelay: `${index * 100}ms` }} /></div>
                    </div>
                  );
                })}
              </div>
              {topCities.length > INITIAL_VISIBLE_CITY_COUNT && (
                <button
                  type="button"
                  className="pc-city-toggle"
                  aria-expanded={showAllCities}
                  onClick={() => setShowAllCities((expanded) => !expanded)}
                >
                  {showAllCities ? "Mostrar menos" : `Ver todas (${topCities.length})`}
                </button>
              )}
            </>
          ) : <p className="pc-empty">Todavía no hay lugares publicados.</p>}
        </section>

        <section className="pc-card pc-s6">
          <header><h2>Quiénes usan la plataforma</h2><span>{users.length} usuarios</span></header>
          <div className="pc-stack">
            {admins.length > 0 && <i style={{ flex: admins.length, background: "#3b73ff" }} />}
            {regularUsers.length > 0 && <i style={{ flex: regularUsers.length, background: "#e0457b" }} />}
            {owners.length > 0 && <i style={{ flex: owners.length, background: "#7c6cff" }} />}
            {otherRoles > 0 && <i style={{ flex: otherRoles, background: "#6b7280" }} />}
          </div>
          <div className="pc-ustats">
            <div style={{ "--c": "#3b73ff" } as CSSProperties}><b>{admins.length}</b><span>Administradores</span></div>
            <div style={{ "--c": "#e0457b" } as CSSProperties}><b>{regularUsers.length}</b><span>Usuarios regulares</span></div>
            <div style={{ "--c": "#7c6cff" } as CSSProperties}><b>{owners.length}</b><span>Propietarios</span></div>
            {otherRoles > 0 && <div style={{ "--c": "#6b7280" } as CSSProperties}><b>{otherRoles}</b><span>Otros roles</span></div>}
            <div style={{ "--c": "#3ccf82" } as CSSProperties}><b>{users.length ? Math.round((activeUsers.length / users.length) * 100) : 0}%</b><span>Activos</span></div>
          </div>
        </section>

        <Feed title="Nuevos usuarios" count={recentUsers.length}>
          {recentUsers.map((user) => <li key={user.id}><div className="pc-av">{text(user.full_name, user.username).slice(0, 1).toUpperCase()}</div><div><b>{text(user.full_name, user.username)}</b><small>{user.username}</small></div></li>)}
          {!recentUsers.length && <li className="pc-feed-empty">No hay usuarios recientes.</li>}
        </Feed>
        <Feed title="Últimas reservas" count={recentReservations.length}>
          {recentReservations.map((reservation) => (
            <li key={reservation.id}><div className="pc-ico" style={{ "--c": "#3ccf82" } as CSSProperties}><Icon name="calendar" /></div><div><b>{text(reservation.hotel, "Reserva sin espacio")}</b><small>{text(reservation.username, "Cliente")}</small></div><span className="pc-chip">{text(reservation.estado, "Sin estado")}</span></li>
          ))}
          {!recentReservations.length && <li className="pc-feed-empty">No hay reservas recientes.</li>}
        </Feed>
        <Feed title="Nuevos lugares" count={recentPlaces.length}>
          {recentPlaces.map((place) => <li key={place.id}><div className="pc-ico" style={{ "--c": "#f0a951" } as CSSProperties}><Icon name="home" /></div><div><b>{place.name}</b><small>{text(place.tipo, "Espacio")} · {text(place.ciudad, "Sin ciudad")}</small></div></li>)}
          {!recentPlaces.length && <li className="pc-feed-empty">No hay lugares recientes.</li>}
        </Feed>
      </div>
    </div>
  );
}
