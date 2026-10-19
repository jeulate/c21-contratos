import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { buildStats, listContracts } from "@/lib/contracts";
import { stateLabel, typeLabel } from "@/lib/contract-types";
import { StateBadge } from "@/components/badge";

function Bars({ title, data, label }: { title: string; data: [string, number][]; label?: (key: string) => string }) {
  const max = Math.max(1, ...data.map((item) => item[1]));

  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="mb-5 text-sm font-semibold text-ink dark:text-white">{title}</h2>
      <ul className="space-y-4">
        {data.map(([key, value]) => (
          <li key={key} className="text-sm">
            <div className="mb-2 flex justify-between gap-3">
              <span className="text-ink-soft dark:text-carbon-300">{label ? label(key) : key}</span>
              <span className="tabular-nums text-ink-mute dark:text-carbon-400">{value}</span>
            </div>
            <div className="h-2 rounded-full bg-stone-100 dark:bg-carbon-800">
              <div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${(value / max) * 100}%` }} />
            </div>
          </li>
        ))}
        {!data.length && <li className="rounded-xl bg-stone-50 px-4 py-5 text-center text-sm text-ink-mute dark:bg-carbon-950 dark:text-carbon-400">Sin datos todavía.</li>}
      </ul>
    </section>
  );
}

function MetricIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 15v-4m4 4V7m4 8V9m4 6V5" />
    </svg>
  );
}

export default async function Dashboard() {
  await requireSession(["admin", "administrativo"]);
  const stats = buildStats(await listContracts());
  const metrics = [
    { label: "Contratos registrados", value: stats.total },
    { label: "Firmados este mes", value: stats.firmadosMes },
    { label: "En revisión", value: stats.enRevision },
    { label: "Monto firmado", value: `USD ${stats.montoFirmado.USD.toLocaleString("es-BO")}`, sub: `BOB ${stats.montoFirmado.BOB.toLocaleString("es-BO")}` },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex justify-end">
        <a href="/api/export" className="btn-ghost gap-2">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" /></svg>
          Exportar CSV
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {metrics.map((metric) => (
          <section key={metric.label} className="panel p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-ink-mute dark:text-carbon-400">{metric.label}</p>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-50 text-gold-700 dark:bg-gold-500/10 dark:text-gold-300"><MetricIcon /></span>
            </div>
            <p className="text-2xl font-semibold tracking-tight tabular-nums text-ink dark:text-white sm:text-[28px]">{metric.value}</p>
            {metric.sub && <p className="mt-1 text-sm tabular-nums text-ink-mute dark:text-carbon-400">{metric.sub}</p>}
          </section>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Bars title="Contratos por estado" data={stats.porEstado} label={stateLabel} />
        <Bars title="Por tipo de contrato" data={stats.porTipo} label={typeLabel} />
        <Bars title="Por asesor" data={stats.porAsesor} />
      </div>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-sm font-semibold text-ink dark:text-white">Actividad reciente</h2>
            <p className="mt-1 text-xs text-ink-mute dark:text-carbon-400">Últimos contratos actualizados</p>
          </div>
          <Link href="/contratos" className="shrink-0 text-sm font-medium text-gold-700 hover:text-gold-600 dark:text-gold-300">Ver contratos</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-y border-stone-100 bg-stone-50/70 dark:border-carbon-800 dark:bg-carbon-950/50">
              <tr><th className="th">Código</th><th className="th">Tipo</th><th className="th">Cliente</th><th className="th">Asesor</th><th className="th">Estado</th><th className="th">Actualizado</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-carbon-800">
              {stats.recientes.map((contract) => (
                <tr key={contract.id} className="transition hover:bg-gold-50/50 dark:hover:bg-carbon-800/50">
                  <td className="td"><Link href={`/contratos/${contract.id}`} className="font-semibold text-gold-700 underline decoration-gold-300 underline-offset-4 dark:text-gold-300">{contract.id}</Link></td>
                  <td className="td">{typeLabel(contract.tipo)}</td>
                  <td className="td font-medium text-ink dark:text-carbon-100">{contract.cliente}</td>
                  <td className="td">{contract.asesorNombre}</td>
                  <td className="td"><StateBadge id={contract.estado} /></td>
                  <td className="td tabular-nums text-ink-mute dark:text-carbon-400">{new Date(contract.updatedAt).toLocaleDateString("es-BO")}</td>
                </tr>
              ))}
              {!stats.recientes.length && <tr><td colSpan={6} className="td py-12 text-center text-ink-mute dark:text-carbon-400">Cuando se registren contratos, la actividad aparecerá aquí.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
