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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Contratos</h1>
        <div className="ml-auto flex gap-2">
          {staff && <a href="/api/export" className="btn-ghost">Exportar CSV</a>}
          <Link href="/contratos/nuevo" className="btn">Nuevo contrato</Link>
        </div>
      </div>

      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={filters.q} placeholder="Buscar cliente, propiedad o código" className="input max-w-xs" />
        <select name="tipo" defaultValue={filters.tipo ?? ""} className="input w-auto">
          <option value="">Todos los tipos</option>
          {CONTRACT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select name="estado" defaultValue={filters.estado ?? ""} className="input w-auto">
          <option value="">Todos los estados</option>
          {STATES.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
        <button className="btn-ghost">Filtrar</button>
      </form>

      <div className="panel overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-stone-200">
            <tr>
              <th className="th">Código</th><th className="th">Tipo</th><th className="th">Cliente</th>
              <th className="th">Propiedad</th>{staff && <th className="th">Asesor</th>}
              <th className="th">Monto</th><th className="th">Estado</th><th className="th">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-gold-50">
                <td className="td"><Link href={`/contratos/${c.id}`} className="font-medium underline decoration-gold-500 underline-offset-2">{c.id}</Link></td>
                <td className="td">{typeLabel(c.tipo)}</td>
                <td className="td">{c.cliente}</td>
                <td className="td max-w-[16rem] truncate">{c.propiedad}</td>
                {staff && <td className="td">{c.asesorNombre}</td>}
                <td className="td tabular-nums">{c.moneda} {c.monto.toLocaleString("es-BO")}</td>
                <td className="td"><StateBadge id={c.estado} /></td>
                <td className="td tabular-nums">{c.fecha}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={8} className="td py-10 text-center text-ink-mute">
                {all.length ? "Ningún contrato coincide con el filtro." : "Aún no hay contratos. Crea el primero con «Nuevo contrato»."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
