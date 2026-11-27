import Image from "next/image";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listContracts, type Contract } from "@/lib/contracts";
import { stateLabel, typeLabel } from "@/lib/contract-types";
import { StateBadge } from "@/components/badge";
import { getDashboardExchangeRate } from "@/lib/dashboard-settings";
import { getCurrencyCatalog } from "@/lib/contract-currencies";
import { listUsers } from "@/lib/users";
import { contractExpirationDate, UPCOMING_EXPIRY_WINDOW_DAYS } from "@/lib/contract-validity";

const timeZone = "America/La_Paz";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const chartGold = "#BEAF87";
const chartSlate = "#7c8798";

function isDateInput(value?: string): value is string {
  if (!value || !datePattern.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function boliviaDate(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function shiftDate(date: string, amount: number) {
  const shifted = new Date(`${date}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + amount);
  return shifted.toISOString().slice(0, 10);
}

function dayDistance(from: string, to: string) {
  return Math.floor((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

function getSignedAt(contract: Contract) {
  const event = contract.history?.findLast((item) => item.changes.some((change) => /\ba firmado\s*$/i.test(change)));
  if (event?.at) return event.at;
  return contract.estado === "firmado" ? contract.updatedAt : undefined;
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function MetricIcon({ kind }: { kind: "documents" | "signed" | "review" | "money" | "expiry" }) {
  const paths = {
    documents: <><path d="M7 3.75h7l4 4v12.5a1.75 1.75 0 0 1-1.75 1.75h-9.5A1.75 1.75 0 0 1 5 20.25V5.5a1.75 1.75 0 0 1 2-1.75Z" /><path d="M14 4v4h4M8.5 13h7m-7 3.5h7" /></>,
    signed: <><path d="m5 12 4.5 4.5L19 7" /><circle cx="12" cy="12" r="9" /></>,
    review: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    money: <><path d="M12 3v18m5-14H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
    expiry: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2M8 2v2m8-2v2" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">{paths[kind]}</svg>;
}

function MetricCard({ label, value, sub, kind, detail }: { label: string; value: string | number; sub: string; kind: "documents" | "signed" | "review" | "money" | "expiry"; detail?: string }) {
  return (
    <section className="panel relative overflow-hidden p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-mute dark:text-carbon-400">{label}</p>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-50 text-gold-700 dark:bg-gold-500/10 dark:text-gold-300"><MetricIcon kind={kind} /></span>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight tabular-nums text-ink dark:text-white sm:text-[28px]">{value}</p>
      <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">{sub}</p>
      {detail && <p className="mt-3 text-xs tabular-nums text-ink-soft dark:text-carbon-300">{detail}</p>}
      <span aria-hidden="true" className="absolute -bottom-8 -right-5 h-24 w-24 rounded-full bg-gold-100/50 blur-2xl dark:bg-gold-500/10" />
    </section>
  );
}

function TrendChart({ data }: { data: { label: string; created: number; signed: number }[] }) {
  const max = Math.max(1, ...data.flatMap((item) => [item.created, item.signed]));
  const x = (index: number) => data.length <= 1 ? 380 : 44 + (index * 672) / (data.length - 1);
  const y = (value: number) => 202 - (value / max) * 158;
  const line = (field: "created" | "signed") => data.map((point, index) => `${index ? "L" : "M"} ${x(index)} ${y(point[field])}`).join(" ");
  const area = (field: "created" | "signed") => `${line(field)} L ${x(data.length - 1)} 210 L ${x(0)} 210 Z`;
  const guideValues = [0, Math.ceil(max / 2), max];

  return (
    <section className="panel min-w-0 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-sm font-semibold text-ink dark:text-white">Actividad de contratos</h2><p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Registros y firmas a lo largo del periodo</p></div>
        <div className="flex gap-4 text-xs text-ink-mute dark:text-carbon-400"><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-gold-500" />Registrados</span><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-slate-500" />Firmados</span></div>
      </div>
      <div className="mt-5 overflow-hidden">
        <svg viewBox="0 0 760 250" role="img" aria-label="Gráfico de contratos registrados y firmados en el periodo" className="h-60 w-full overflow-visible">
          {guideValues.map((value, index) => {
            const gy = 202 - (value / max) * 158;
            return <g key={`${value}-${index}`}><line x1="38" x2="728" y1={gy} y2={gy} stroke="currentColor" className="text-stone-200 dark:text-carbon-800" strokeDasharray="3 5" /><text x="4" y={gy + 4} className="fill-ink-mute text-[11px] dark:fill-carbon-500">{value}</text></g>;
          })}
          <path d={area("created")} fill={chartGold} fillOpacity=".12" />
          <path d={area("signed")} fill={chartSlate} fillOpacity=".08" />
          <path d={line("created")} fill="none" stroke={chartGold} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d={line("signed")} fill="none" stroke={chartSlate} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {data.map((point, index) => <g key={point.label}><circle cx={x(index)} cy={y(point.created)} r="3.5" fill={chartGold} stroke="white" strokeWidth="1.5" /><circle cx={x(index)} cy={y(point.signed)} r="3" fill={chartSlate} stroke="white" strokeWidth="1.5" /><text x={x(index)} y="235" textAnchor="middle" className="fill-ink-mute text-[10px] dark:fill-carbon-500">{point.label}</text></g>)}
        </svg>
      </div>
    </section>
  );
}

function StatusChart({ data }: { data: [string, number][] }) {
  const colors: Record<string, string> = { revision: "#BEAF87", firmado: "#1f9d77", observado: "#d76b67", borrador: "#8792a2", anulado: "#6b7280" };
  const total = data.reduce((sum, [, count]) => sum + count, 0);
  let accumulated = 0;
  const stops = data.map(([key, value]) => {
    const start = accumulated;
    accumulated += total ? value / total * 100 : 0;
    return `${colors[key] ?? "#a8a29e"} ${start}% ${accumulated}%`;
  });
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-ink dark:text-white">Contratos por estado</h2>
      <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Distribución de los registros del periodo</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-6 sm:justify-between">
        <div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: total ? `conic-gradient(${stops.join(",")})` : "conic-gradient(#e7e5e4 0 100%)" }} role="img" aria-label={`${total} contratos en el periodo`}>
          <div className="absolute inset-[15px] grid place-content-center rounded-full bg-white text-center dark:bg-carbon-900"><strong className="text-2xl tabular-nums text-ink dark:text-white">{total}</strong><span className="text-[10px] text-ink-mute dark:text-carbon-400">contratos</span></div>
        </div>
        <ul className="min-w-[150px] flex-1 space-y-3">
          {data.map(([key, value]) => <li key={key} className="flex items-center justify-between gap-3 text-xs"><span className="flex items-center gap-2 text-ink-soft dark:text-carbon-300"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[key] ?? "#a8a29e" }} />{stateLabel(key)}</span><span className="font-semibold tabular-nums text-ink dark:text-carbon-100">{value}</span></li>)}
          {!data.length && <li className="text-sm text-ink-mute dark:text-carbon-400">Sin datos en este periodo.</li>}
        </ul>
      </div>
    </section>
  );
}

function BarRanking({ title, data }: { title: string; data: [string, number][] }) {
  const rows = data.slice(0, 5);
  const max = Math.max(1, ...rows.map(([, value]) => value));
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-ink dark:text-white">{title}</h2>
      <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Por cantidad de contratos registrados</p>
      <ul className="mt-6 space-y-4">
        {rows.map(([label, value], index) => <li key={label}>
          <div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="flex min-w-0 items-center gap-2 text-ink-soft dark:text-carbon-300"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-stone-100 text-[10px] font-semibold text-ink-mute dark:bg-carbon-800 dark:text-carbon-300">{index + 1}</span><span className="truncate">{label}</span></span><strong className="tabular-nums text-ink dark:text-white">{value}</strong></div>
          <div className="h-2 rounded-full bg-stone-100 dark:bg-carbon-800"><div className="h-full rounded-full bg-gold-500" style={{ width: `${value / max * 100}%` }} /></div>
        </li>)}
        {!rows.length && <li className="py-8 text-center text-sm text-ink-mute dark:text-carbon-400">Sin datos en este periodo.</li>}
      </ul>
    </section>
  );
}

function AdvisorAvatar({ src, name }: { src?: string; name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return src ? <Image src={src} alt={`Foto de ${name}`} width={42} height={42} unoptimized className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-carbon-800" /> : <span aria-label={`Avatar de ${name}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-100 text-xs font-semibold text-gold-800 ring-2 ring-white dark:bg-gold-500/15 dark:text-gold-200 dark:ring-carbon-800">{initials || "A"}</span>;
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const session = await requireSession(["admin", "administrativo", "legal"]);
  const query = await searchParams;
  const today = boliviaDate(new Date());
  const currentMonth = `${today.slice(0, 7)}-01`;
  const period = ["week", "month", "year"].includes(query.period ?? "") ? query.period! : "month";
  const hasCustomRange = Boolean(query.from || query.to);
  const presetFrom = period === "week" ? shiftDate(today, -6) : period === "year" ? `${today.slice(0, 4)}-01-01` : currentMonth;
  let from = isDateInput(query.from) ? query.from : presetFrom;
  let to = isDateInput(query.to) ? query.to : today;
  let rangeError = "";
  if (from > to) {
    rangeError = "La fecha inicial debe ser anterior o igual a la fecha final.";
    from = presetFrom;
    to = today;
  }

  const [allContracts, exchangeRate, users, currencyCatalog] = await Promise.all([listContracts(), getDashboardExchangeRate(), listUsers(), getCurrencyCatalog()]);
  const isInRange = (value?: string) => Boolean(value && boliviaDate(new Date(value)) >= from && boliviaDate(new Date(value)) <= to);
  const createdInRange = allContracts.filter((contract) => isInRange(contract.createdAt));
  const expiryThrough = shiftDate(today, UPCOMING_EXPIRY_WINDOW_DAYS);
  const expiringSoon = allContracts.filter((contract) => {
    if (contract.estado === "anulado") return false;
    const expiry = contractExpirationDate(contract.fecha, contract.vigenciaCantidad, contract.vigenciaUnidad);
    return Boolean(expiry && expiry >= today && expiry <= expiryThrough);
  });
  const signedInRange = allContracts.filter((contract) => contract.estado === "firmado" && isInRange(getSignedAt(contract)));
  const reviewingInRange = createdInRange.filter((contract) => contract.estado === "revision");
  const bobPerCurrency = new Map(currencyCatalog.filter((currency) => currency.bobPerUnit !== null).map((currency) => [currency.code, currency.bobPerUnit as number]));
  const signedWithoutRate = signedInRange.filter((contract) => !bobPerCurrency.has(contract.moneda)).length;
  const signedBob = signedInRange.reduce((sum, contract) => sum + contract.monto * (bobPerCurrency.get(contract.moneda) ?? 0), 0);
  const signedUsd = signedBob / exchangeRate;
  const byStatus = countBy(createdInRange, (contract) => contract.estado);
  const byType = countBy(createdInRange, (contract) => contract.tipo);
  const byAdvisor = countBy(createdInRange, (contract) => contract.asesorNombre);
  const advisorByUsername = new Map(users.filter((user) => user.role === "asesor").map((user) => [user.username, user]));
  const recent = [...createdInRange].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  const totalDays = Math.max(1, dayDistance(from, to) + 1);
  const bucketCount = Math.min(8, totalDays);
  const trend = Array.from({ length: bucketCount }, (_, index) => {
    const startOffset = Math.floor(index * totalDays / bucketCount);
    const endOffset = Math.max(startOffset, Math.floor((index + 1) * totalDays / bucketCount) - 1);
    const start = shiftDate(from, startOffset);
    return { start, end: shiftDate(from, endOffset), label: new Intl.DateTimeFormat("es-BO", { timeZone, day: "2-digit", month: "short" }).format(new Date(`${start}T12:00:00Z`)), created: 0, signed: 0 };
  });
  const bucketFor = (date: string) => {
    const offset = dayDistance(from, date);
    return Math.max(0, Math.min(bucketCount - 1, Math.floor(offset * bucketCount / totalDays)));
  };
  for (const contract of allContracts) {
    if (isInRange(contract.createdAt)) trend[bucketFor(boliviaDate(new Date(contract.createdAt)))].created += 1;
    const signedAt = getSignedAt(contract);
    if (contract.estado === "firmado" && isInRange(signedAt)) trend[bucketFor(boliviaDate(new Date(signedAt!)))].signed += 1;
  }

  const pendingLegal = session.role === "legal"
    ? allContracts.filter((contract) => contract.estado === "revision").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    : [];
  const dateRangeLabel = `${new Date(`${from}T12:00:00Z`).toLocaleDateString("es-BO", { timeZone })} – ${new Date(`${to}T12:00:00Z`).toLocaleDateString("es-BO", { timeZone })}`;
  const selectedTab = hasCustomRange ? "custom" : period;
  const periodHref = (value: "week" | "month" | "year") => `/dashboard?period=${value}`;

  return (
    <div className="space-y-5 sm:space-y-6">
      {session.role === "legal" && <section aria-label="Notificaciones para Legal" aria-live="polite" className="panel overflow-hidden border-amber-300 dark:border-gold-500/40">
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-4 dark:border-carbon-800 dark:bg-gold-500/10 sm:px-6">
          <h2 className="text-sm font-bold text-amber-950 dark:text-gold-100">Notificaciones · contratos por revisar</h2>
          <p className="mt-1 text-sm text-amber-900 dark:text-carbon-200">{pendingLegal.length ? `${pendingLegal.length} contrato${pendingLegal.length === 1 ? "" : "s"} esperan revisión o fueron reenviados por el asesor.` : "No hay contratos pendientes de revisión legal."}</p>
        </div>
        {pendingLegal.length > 0 && <ul className="divide-y divide-stone-100 dark:divide-carbon-800">{pendingLegal.slice(0, 4).map((contract) => <li key={contract.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="min-w-0"><p className="text-sm font-semibold text-ink dark:text-white">Contrato enviado a revisión · {contract.cliente}</p><p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Código {contract.id} · {contract.asesorNombre} · {new Date(contract.updatedAt).toLocaleString("es-BO", { timeZone })}</p></div><Link href={`/contratos/${contract.id}`} className="btn-ghost shrink-0">Revisar</Link></li>)}</ul>}
      </section>}

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-stone-100 px-5 py-5 dark:border-carbon-800 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-700 dark:text-gold-300">Rendimiento operativo</p><h2 className="mt-1 text-lg font-semibold text-ink dark:text-white">Resumen general</h2><p className="mt-1 text-sm text-ink-mute dark:text-carbon-400">{dateRangeLabel} · datos de contratos</p></div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <nav aria-label="Periodo de análisis" className="inline-flex rounded-xl bg-stone-100 p-1 dark:bg-carbon-950">
              {([["week", "Semanal"], ["month", "Mensual"], ["year", "Anual"]] as const).map(([value, label]) => <Link key={value} href={periodHref(value)} aria-current={selectedTab === value ? "page" : undefined} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${selectedTab === value ? "bg-white text-ink shadow-sm dark:bg-carbon-800 dark:text-white" : "text-ink-mute hover:text-ink dark:text-carbon-400 dark:hover:text-white"}`}>{label}</Link>)}
            </nav>
            <a href="/api/export" className="btn-ghost inline-flex items-center justify-center gap-2"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" /></svg>Exportar CSV</a>
          </div>
        </div>
        <form method="get" className="flex flex-col gap-3 bg-stone-50/70 p-4 dark:bg-carbon-950/50 sm:flex-row sm:flex-wrap sm:items-end sm:px-6">
          <input type="hidden" name="period" value="custom" />
          <div><label className="label" htmlFor="dashboard-from">Desde</label><input className="input min-w-40" id="dashboard-from" name="from" type="date" value={from} required /></div>
          <div><label className="label" htmlFor="dashboard-to">Hasta</label><input className="input min-w-40" id="dashboard-to" name="to" type="date" value={to} required /></div>
          <button type="submit" className="btn-ghost h-[42px] gap-2"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10m-7 6h4" /></svg>Filtrar fechas</button>
          {rangeError && <p role="alert" className="text-sm text-red-600 dark:text-red-300 sm:self-center">{rangeError}</p>}
        </form>
        <div className="grid divide-y divide-stone-100 dark:divide-carbon-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0 2xl:grid-cols-5 2xl:divide-x-0 2xl:divide-y-0">
          <MetricCard label="Contratos registrados" value={createdInRange.length} sub="Registrados dentro del periodo" kind="documents" />
          <MetricCard label="Firmados en el periodo" value={signedInRange.length} sub="Según fecha de aprobación legal" kind="signed" />
          <MetricCard label="En revisión" value={reviewingInRange.length} sub="Pendientes entre los registros del periodo" kind="review" />
          <MetricCard label="Monto firmado" value={`Bs. ${signedBob.toLocaleString("es-BO", { maximumFractionDigits: 2 })}`} sub={signedWithoutRate ? `${signedWithoutRate} contrato(s) excluido(s): divisa sin equivalencia configurada` : "Equivalente consolidado en bolivianos"} kind="money" detail={`USD ${signedUsd.toLocaleString("es-BO", { maximumFractionDigits: 2 })} · T.C. ${exchangeRate.toLocaleString("es-BO", { maximumFractionDigits: 4 })} Bs./USD`} />
          <MetricCard label="Próximos a vencer" value={expiringSoon.length} sub={`Vencen en los próximos ${UPCOMING_EXPIRY_WINDOW_DAYS} días`} kind="expiry" />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,0.85fr)]">
        <TrendChart data={trend} />
        <StatusChart data={byStatus} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BarRanking title="Tipos de contrato" data={byType.map(([id, value]) => [typeLabel(id), value])} />
        <BarRanking title="Contratos por asesor" data={byAdvisor} />
      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4 dark:border-carbon-800 sm:px-6">
          <div><h2 className="text-sm font-semibold text-ink dark:text-white">Actividad reciente</h2><p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Asesores que registraron contratos durante el periodo</p></div>
          <Link href="/contratos" className="shrink-0 text-sm font-semibold text-gold-700 transition hover:text-gold-600 dark:text-gold-300">Ver contratos →</Link>
        </div>
        <ul className="divide-y divide-stone-100 dark:divide-carbon-800">
          {recent.map((contract) => {
            const advisor = advisorByUsername.get(contract.asesor.toLowerCase());
            const photoId = advisor?.advisorProfile?.photoId;
            const avatar = photoId ? `/api/advisors/${encodeURIComponent(contract.asesor)}/avatar` : undefined;
            return <li key={contract.id} className="flex items-center gap-3 px-5 py-4 transition hover:bg-gold-50/40 dark:hover:bg-carbon-800/40 sm:gap-4 sm:px-6">
              <AdvisorAvatar src={avatar} name={advisor?.advisorProfile?.fullName || contract.asesorNombre} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink dark:text-white">{advisor?.advisorProfile?.fullName || contract.asesorNombre}</p><p className="mt-1 truncate text-xs text-ink-mute dark:text-carbon-400">Registró <Link href={`/contratos/${contract.id}`} className="font-semibold text-gold-700 underline decoration-gold-300 underline-offset-2 dark:text-gold-300">#{contract.id}</Link> · {contract.cliente}</p></div>
              <div className="hidden shrink-0 sm:block"><StateBadge id={contract.estado} /></div>
              <time dateTime={contract.createdAt} className="shrink-0 text-right text-xs tabular-nums text-ink-mute dark:text-carbon-400">{new Date(contract.createdAt).toLocaleDateString("es-BO", { timeZone })}<span className="mt-1 block">{new Date(contract.createdAt).toLocaleTimeString("es-BO", { timeZone, hour: "2-digit", minute: "2-digit" })}</span></time>
            </li>;
          })}
          {!recent.length && <li className="px-5 py-12 text-center text-sm text-ink-mute dark:text-carbon-400">No hay contratos registrados en las fechas seleccionadas.</li>}
        </ul>
      </section>
    </div>
  );
}
