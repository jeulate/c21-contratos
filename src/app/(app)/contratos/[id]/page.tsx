import { notFound } from "next/navigation";
import { requireSession, isStaff } from "@/lib/auth";
import { getContract } from "@/lib/contracts";
import { ContractForm } from "@/components/contract-form";
import { StateBadge } from "@/components/badge";

export default async function ContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  const { id } = await params;
  const c = await getContract(id);
  if (!c || (!isStaff(s) && c.asesor !== s.username)) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-4 dark:border-carbon-800 dark:bg-carbon-900">
        <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-ink-mute dark:text-carbon-400">Detalle del contrato</p><h2 className="mt-1 truncate text-base font-semibold text-ink dark:text-white">{c.id}</h2></div>
        <StateBadge id={c.estado} />
        <span className="ml-auto text-sm text-ink-mute dark:text-carbon-400">Asesor: {c.asesorNombre}</span>
      </div>
      <ContractForm contract={c} />
      <section className="panel p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink dark:text-white">Historial de cambios</h2>
        <ul className="space-y-3 text-sm text-ink-soft dark:text-carbon-300">
          {[...c.history].reverse().map((h, i) => (
            <li key={i}>
              <span className="tabular-nums text-ink-mute">{new Date(h.at).toLocaleString("es-BO")}</span> · {h.by}: {h.changes.join(", ")}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
