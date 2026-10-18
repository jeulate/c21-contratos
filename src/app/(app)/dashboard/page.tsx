import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { buildStats, listContracts } from "@/lib/contracts";
import { stateLabel, typeLabel } from "@/lib/contract-types";
import { StateBadge } from "@/components/badge";

function Bars({ title, data, label }: { title: string; data: [string, number][]; label?: (k: string) => string }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  return (
    <section className="panel p-5">
      <h2 className="mb-4 text-sm font-medium">{title}</h2>
      <ul className="space-y-3">
        {data.map(([k, n]) => (
          <li key={k} className="text-sm">
            <div className="mb-1 flex justify-between"><span>{label ? label(k) : k}</span><span className="tabular-nums text-ink-mute">{n}</span></div>
            <div className="h-1.5 rounded bg-stone-100"><div className="h-full rounded bg-gold-500" style={{ width: `${(n / max) * 100}%` }} /></div>
          </li>
        ))}
        {!data.length && <li className="text-sm text-ink-mute">Sin datos todavía.</li>}
      </ul>
    </section>
  );
}

export default async function Dashboard() {
  await requireSession(["admin", "administrativo"]);
  const st = buildStats(await listContracts());
  const kpis = [
    { label: "Contratos registrados", value: st.total },
    { label: "Firmados este mes", value: st.firmadosMes },
    { label: "En revisión", value: st.enRevision },
    { label: "Monto firmado", value: `USD ${st.montoFirmado.USD.toLocaleString("es-BO")}`, sub: `BOB ${st.montoFirmado.BOB.toLocaleString("es-BO")}` },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <a href="/api/export" className="btn-ghost ml-auto">Exportar CSV</a>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="panel p-5">
            <p className="text-sm text-ink-mute">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{k.value}</p>
            {k.sub && <p className="text-sm tabular-nums text-ink-mute">{k.sub}</p>}
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Bars title="Por estado" data={st.porEstado} label={stateLabel} />
        <Bars title="Por tipo de contrato" data={st.porTipo} label={typeLabel} />
        <Bars title="Por asesor" data={st.porAsesor} />
      </div>
      <section className="panel overflow-x-auto">
        <h2 className="px-5 pt-4 text-sm font-medium">Actividad reciente</h2>
        <table className="mt-2 w-full">
          <tbody className="divide-y divide-stone-100">
            {st.recientes.map((c) => (
              <tr key={c.id}>
                <td className="td"><Link href={`/contratos/${c.id}`} className="font-medium underline decoration-gold-500 underline-offset-2">{c.id}</Link></td>
                <td className="td">{typeLabel(c.tipo)}</td>
                <td className="td">{c.cliente}</td>
                <td className="td">{c.asesorNombre}</td>
                <td className="td"><StateBadge id={c.estado} /></td>
                <td className="td tabular-nums text-ink-mute">{new Date(c.updatedAt).toLocaleDateString("es-BO")}</td>
              </tr>
            ))}
            {!st.recientes.length && <tr><td className="td py-8 text-center text-ink-mute">Cuando los asesores registren contratos, la actividad aparecerá aquí.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
