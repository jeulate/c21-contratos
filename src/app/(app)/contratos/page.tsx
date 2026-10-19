import Link from "next/link";
import { requireSession, isStaff } from "@/lib/auth";
import { listContracts } from "@/lib/contracts";
import { CONTRACT_TYPES, STATES, typeLabel } from "@/lib/contract-types";
import { StateBadge } from "@/components/badge";

export default async function ContratosPage({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string; estado?: string }> }) {
  const s = await requireSession();
  const filters = await searchParams;
  const staff = isStaff(s);
  const all = await listContracts(staff ? undefined : { asesor: s.username });
  const q = filters.q?.toLowerCase().trim();
  const rows = all.filter(
    (c) =>
      (!filters.tipo || c.tipo === filters.tipo) &&
      (!filters.estado || c.estado === filters.estado) &&
      (!q || [c.cliente, c.propiedad, c.id, c.asesorNombre].some((v) => v.toLowerCase().includes(q))),
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {staff && <a href="/api/export" className="btn-ghost gap-2">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" /></svg>
            Exportar CSV
          </a>}
          {s.role !== "legal" && <Link href="/contratos/nuevo" className="btn gap-2">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" /></svg>
            Nuevo contrato
          </Link>}
        </div>
      </div>

      <form className="panel grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-[minmax(220px,1fr)_minmax(170px,220px)_minmax(160px,200px)_auto] xl:items-end">
        <div>
          <label className="label" htmlFor="q">Buscar</label>
          <input id="q" name="q" defaultValue={filters.q} placeholder="Cliente, propiedad o código" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="tipo">Tipo de contrato</label>
          <select id="tipo" name="tipo" defaultValue={filters.tipo ?? ""} className="input">
          <option value="">Todos los tipos</option>
          {CONTRACT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="estado">Estado</label>
          <select id="estado" name="estado" defaultValue={filters.estado ?? ""} className="input">
          <option value="">Todos los estados</option>
          {STATES.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </div>
        <button className="btn-ghost h-[42px] gap-2 sm:col-span-2 xl:col-span-1">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10m-7 6h4" /></svg>
          Filtrar
        </button>
      </form>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 dark:border-carbon-800 sm:px-6">
          <div><h2 className="text-sm font-semibold text-ink dark:text-white">Listado de contratos</h2><p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">{rows.length} resultado{rows.length === 1 ? "" : "s"}</p></div>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead className="border-b border-stone-200 bg-stone-50/70 dark:border-carbon-800 dark:bg-carbon-950/50">
            <tr>
              <th className="th">Código</th><th className="th">Tipo</th><th className="th">Cliente</th>
              <th className="th">Propiedad</th>{staff && <th className="th">Asesor</th>}
              <th className="th">Monto</th><th className="th">Estado</th><th className="th">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-carbon-800">
            {rows.map((c) => (
              <tr key={c.id} className="transition hover:bg-gold-50/60 dark:hover:bg-carbon-800/50">
                <td className="td"><Link href={`/contratos/${c.id}`} className="font-medium underline decoration-gold-500 underline-offset-2">{c.id}</Link></td>
                <td className="td">{typeLabel(c.tipo)}</td>
                <td className="td font-medium text-ink dark:text-carbon-100">{c.cliente}</td>
                <td className="td max-w-[16rem] truncate">{c.propiedad}</td>
                {staff && <td className="td">{c.asesorNombre}</td>}
                <td className="td tabular-nums">{c.moneda} {c.monto.toLocaleString("es-BO")}</td>
                <td className="td"><StateBadge id={c.estado} /></td>
                <td className="td tabular-nums">{c.fecha}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={staff ? 8 : 7} className="td py-12 text-center text-ink-mute dark:text-carbon-400">
                {all.length ? "Ningún contrato coincide con el filtro." : "Aún no hay contratos. Crea el primero con «Nuevo contrato»."}
              </td></tr>
            )}
          </tbody>
        </table>
        </div>
      </section>
    </div>
  );
}
